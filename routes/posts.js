const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Counter = require('../models/Counter');
const util = require('../util');
const async = require('async');


// 1. util.isLoggedIn를 사용해서 로그인 된 경우에만 다음 callback 호출
// 2. checkPermission를 사용해서 본인이 작성한 글에만 다음 callback 호출

// Index
router.get('/', (req, res) => {
    let page = (Math.max(1, req.query.page) > 1) ? parseInt(req.query.page) : 1;
    let limit = (Math.max(1, req.query.limit) > 1) ? parseInt(req.query.limit) : 5;
    let search = createSearch(req.query);

    async.waterfall([
        function(callback) {
            // search.findUser가 null인 경우 이 함수를 생략, 
            // null이 아니라면 유저를 찾아서 findPost에 더해준다.
            if (!search.findUser)
                return callback(null);
            User.find(search.findUser, (err, users) => {
                if (err)
                    callback(err);
                let or = [];
                users.forEach(user => {
                    or.push({ author: mongoose.Types.ObjectId(user._id) });
                });
                if (search.findPost.$or)
                    search.findPost.$or = search.findPost.$or.concat(or);
                else if (or.length > 0)
                    search.findPost = { $or: or };
                callback(null);            
            });    
        },
        function(callback) {
            // search.findUser가 존재하지만 search.findPost가 초기값({})인 경우 
            // 검색결과가 없는 것으로 판단 Post검색을 하지 않는다.
            if (search.findUser && !search.findPost.$or)
                return callback(null, null, 0);
            Post.countDocuments(search.findPost, (err, count) => {
                if (err) callback(err);
                skip = (page - 1)*limit;
                maxPage = Math.ceil(count/limit);
                callback(null, skip, maxPage);
            });        
        },
        function(skip, maxPage, callback) {
            // search.findUser가 존재하지만 search.findPost가 초기값({})인 경우 
            // 검색결과가 없는 것으로 판단 Post검색을 하지 않는다.
            if (search.findUser && !search.findPost.$or)
                return callback(null, [], 0);
            Post.find(search.findPost)
                .populate('author')
                .sort('-createdAt')
                .skip(skip)
                .limit(limit)
                .exec((err, posts) => {
                    if (err) callback(err);
                    callback(null, posts, maxPage);
                    
                });
        }],
        function(err, posts, maxPage) {
            if (err) 
                return res.json({ message: err });
            return res.render('posts/index', {
                posts:posts, page:page, maxPage:maxPage, urlQuery:req._parsedUrl.query,
                search:search,
            }); 
        }); 
});

// New
router.get('/new', util.isLoggedIn, (req, res) => {
    let post = req.flash('post')[0] || {};
    let errors = req.flash('errors')[0] || {};
    res.render('posts/new', { post:post, errors:errors });
});

// Create
router.post('/', util.isLoggedIn, (req, res) => {
    async.waterfall([
        function(callback) {
            Counter.findOne({ name: 'posts' }, (err, counter) => {
                if (err)
                    callback(err);
                if (counter) {
                    callback(null, null, counter);
                } else {
                    Counter.create({ name: 'posts', totalCount: 0, }, (err, counter) => {
                        if (err)
                            return res.json({ message: err });
                        callback(null, null, counter);    
                    });
                }    
            });
        }
    ],
    function(err, callback, counter) {
        if (err) 
            return res.json({ message: err });

        let newPost = req.body;
        // 글을 작성할떄는 req.user._id를 가져와서 post의 author에 기록한다.
        newPost.author = req.user._id;
        newPost.numId = (counter.totalCount + 1);

        Post.create(req.body, (err, post) => {
            if (err) {
                req.flash('post', req.body);
                req.flash('errors', util.parseError(err));
                return res.redirect('/posts/new');
            }
            counter.totalCount++;
            counter.save();
            res.redirect('/posts');
        });
    });
});

// Show
router.get('/:id', (req, res) => {
    Post.findById({_id:req.params.id})
        .populate('author')
        .exec((err, post) => {
            if (err) 
                return res.json(err);
            post.views++;
            post.save();
            res.render('posts/show', { 
                post:post, urlQuery:req._parsedUrl.query, user:req.user, search: createSearch(req.query), 
            });
        });
});

// Edit
router.get('/:id/edit', util.isLoggedIn, checkPermission, (req, res) => {
    let post = req.flash('post')[0];
    let errors = req.flash('errors')[0] || {};
    if (!post) {
        Post.findOne({_id:req.params.id}, (err, post) => {
            if (err) return res.json(err);
            res.render('posts/edit', { post:post, errors:errors });
        });
    } else {
        post._id = req.params.id;
        res.render('posts/edit', { post:post, errors:errors });
    }
    
});

// Update
router.put('/:id', util.isLoggedIn, checkPermission, (req, res) => {
    req.body.updatedAt = Date.now();  // 데이터의 수정이 있는경우 수정된 날자를 업데이트
    Post.findOneAndUpdate({_id:req.params.id}, req.body, { runValidators: true }, (err, post) => {
        if (err) {
            req.flash('post', req.body);
            req.flash('errors', util.parseError(err));
            return res.redirect('/posts/' + req.params.id + '/edit');
        }
        res.redirect('/posts/' + req.params.id);
    });
});

// Destroy
router.delete('/:id', util.isLoggedIn, checkPermission, (req, res) => {
    Post.deleteOne({_id:req.params.id}, err => {
        if (err) return res.json(err);
        res.redirect('/posts');
    });
});


module.exports = router;



// private functions

// checkPermission 함수는 해당 게시물에 기록된 author와 로그인된 user.id를 비교해서
// 같은 경우 통과, 만약 다르다면 util.noPermission함수를 호출
function checkPermission(req, res, next) {
    Post.findOne({_id:req.params.id}, (err, post) => {
        if (err) return res.json(err);
        if (post.author != req.user.id) return util.noPermission(req, res);
        next();
    });
}

// search 함수
function createSearch(queries) {
    let findPost = {}; 
    let findUser = null;
    // 검색어 하이라이트 추가
    // search Object를 만들때 highlight를 추가 - highlight.author = queries.searchText;
    let highlight = {};
    // 작성자 검색기능 추가 
    // author - 검색어와 작성자 id의 일부가 일치하는 경우
    // author! - 검색어와 작성자 id가 완전히 일치하는 경우
    if (queries.searchType && queries.searchText && (queries.searchText.length >= 3)) {
        let searchTypes = queries.searchType.toLowerCase().split(',');
        let postQueries = [];
        if (searchTypes.indexOf('title') >= 0)
            postQueries.push({ title: { $regex: new RegExp(queries.searchText, 'i') } });
            highlight.title = queries.searchText;
        if (searchTypes.indexOf('body') >= 0)
            postQueries.push({ body: { $regex: new RegExp(queries.searchText, 'i') } });
            highlight.body = queries.searchText;
        if (searchTypes.indexOf('author!') >= 0) {
            findUser = { username: queries.searchText };
            highlight.author = queries.searchText;
        } else if (searchTypes.indexOf('author') >= 0) {
            findUser = { username: { $regex: new RegExp(queries.searchText, 'i') } };
            highlight.author = queries.searchText;
        }            
        if (postQueries.length > 0)
            findPost = { $or: postQueries };        
    }

    return { searchType: queries.searchType,
             searchText: queries.searchText,
             findPost: findPost,
             findUser: findUser,
             highlight: highlight};
            
}