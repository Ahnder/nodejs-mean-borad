const express = require('express');

const router = express.Router();
const Post = require('../models/Post');
const util = require('../util');


// Index
router.get('/', (req, res) => {
    Post.find({})
        // Model.populate() 함수는 relationship이 형성되어 있는 항목의 값을 생성해준다
        // 현재 post의 author에는 user의 id가 기록되어 있는데,
        // 이 값을 바탕으로 실제 user의 값을 author에 생성하게 된다.
        .populate('author')
        .sort("-createdAt")  // 나중에 생성된 데이터가 위로 오도록 정렬 
        .exec((err, posts) => {
            if(err) return res.json(err);
            res.render('posts/index', { posts:posts });
        });
});

// New
router.get('/new', (req, res) => {
    let post = req.flash('post')[0] || {};
    let errors = req.flash('errors')[0] || {};
    res.render('posts/new', { post:post, errors:errors });
});

// Create
router.post('/', (req, res) => {
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
    Post.findOne({_id:req.params.id})
        .populate('author')
        .exec((err, post) => {
            if (err) return res.json(err);
            res.render('posts/show', {post:post});
        });
});

// Edit
router.get('/:id/edit', (req, res) => {
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
router.put('/:id', (req, res) => {
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
router.delete('/:id', (req, res) => {
    Post.deleteOne({_id:req.params.id}, err => {
        if (err) return res.json(err);
        res.redirect('/posts');
    });
});


module.exports = router;