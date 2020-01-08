const express = require('express');

const router = express.Router();
const Post = require('../models/Post');
const util = require('../util');
const async = require('async');


// 1. util.isLoggedIn를 사용해서 로그인 된 경우에만 다음 callback 호출
// 2. checkPermission를 사용해서 본인이 작성한 글에만 다음 callback 호출

// Index
router.get('/', (req, res) => {
    let page = (Math.max(1, req.query.page) > 1) ? parseInt(req.query.page) : 1;
    let limit = (Math.max(1, req.query.limit) > 1) ? parseInt(req.query.limit) : 5;

    async.waterfall([
        function(callback) {
            Post.countDocuments({}, (err, count) => {
                if (err) callback(err);
                skip = (page - 1)*limit;
                maxPage = Math.ceil(count/limit);
                callback(null, skip, maxPage);
            });        
        },
        function(skip, maxPage, callback) {
            Post.find({})
                .populate('author')
                .sort('-createdAt')
                .skip(skip)
                .limit(limit)
                .exec((err, posts) => {
                    if (err) callback(err);
                    return res.render('posts/index', {
                        posts:posts, page:page, maxPage:maxPage, urlQuery:req._parsedUrl.query,
                    });
                });
        }],
        function(err) {
            if (err) return res.render({ message: err });
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
    // 글을 작성할떄는 req.user._id를 가져와서 post의 author에 기록한다.
    req.body.author = req.user._id;
    Post.create(req.body, (err, post) => {
        if (err) {
            req.flash('post', req.body);
            req.flash('errors', util.parseError(err));
            return res.redirect('/posts/new');
        }
        res.redirect('/posts');
    });
});

// Show
router.get('/:id', (req, res) => {
    Post.findById({_id:req.params.id})
        .populate('author')
        .exec((err, post) => {
            if (err) return res.json(err);
            res.render('posts/show', { post:post, urlQuery:req._parsedUrl.query, user:req.user });
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
    });
}