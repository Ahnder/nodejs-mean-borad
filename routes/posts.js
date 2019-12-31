const express = require('express');

const router = express.Router();
const Post = require('../models/Post');


// Index
router.get('/', (req, res) => {
    Post.find({})
        .sort("-createdAt")  // 나중에 생성된 데이터가 위로 오도록 정렬 
        .exec((err, posts) => {
            if(err) return res.json(err);
            res.render('posts/index', { posts:posts });
        });
});

// New
router.get('/new', (req, res) => {
    res.render('posts/new');
});

// Create
router.post('/', (req, res) => {
    Post.create(req.body, (err, post) => {
        if (err) return res.json(err);
        res.redirect('/posts');
    });
});

// Show
router.get('/:id', (req, res) => {
    Post.findOne({_id:req.params.id}, (err, post) => {
        if (err) return res.json(err);
        res.render('posts/show', {post:post});
    });
});

// Edit
router.get('/:id/edit', (req, res) => {
    Post.findOne({_id:req.params.id}, (err, post) => {
        if (err) return res.json(err);
        res.render('posts/edit', {post:post});
    });
});

// Update
router.put('/:id', (req, res) => {
    req.body.updatedAt = Date.now();  // 데이터의 수정이 있는경우 수정된 날자를 업데이트
    Post.findOneAndUpdate({_id:req.params.id}, req.body, (err, post) => {
        if (err) return res.json(err);
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