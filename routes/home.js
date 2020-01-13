const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const Post = require('../models/Post');
const async = require('async');


// Home
// Index
// sortConditionPosts() - 요소로 sort 조건을 받아 posts를 생성 후 콜백함수로 넘겨주는 함수
router.get('/', (req, res) => {
    const views = { 'views': -1 }; // 조회수 내림차 순 (조회수 많은 게시물이 상위)
    const createdAt = { 'createdAt': -1 }; // 생성된 날짜 내림차 순 (최근 생성된 게시물이 상위)
    async.parallel([
        function(callback) {
            sortConditionPosts(views, callback);
        },
        function(callback) {
            sortConditionPosts(createdAt, callback);
        }
    ], 
    // 콜백함수
    // viewsPosts - 조회수 순 게시물 모음
    // createdAtPosts - 생성날짜 순 게시물 모음
    function(err, results) {
           if (err) return res.json({ message: err });
           return res.render('home/welcome', { viewsPosts: results[0], 
                                               createdAtPosts: results[1] });  
    });
});

router.get('/about', (req, res) => {
    res.render('home/about');
});
router.get('/project', (req, res) => {
    res.render('home/project');
});

// Login
// login view를 보여주는 router
router.get('/login', (req, res) => {
    let username = req.flash('username')[0];
    let errors = req.flash('errors')[0] || {};
    res.render('home/login', {
        username: username,
        errors: errors,
    });
});

// Post Login
// login form에서 보내진 post request를 처리해주는 route
// 두 개의 callback이 있는데, 첫 번째 callback은 보내진 form의 validation을 위한 것으로
// 에러가 있으면 flash를 만들고 login view로 redirect한다.
// 두 번째 callback은 passport local strategy를 호출해서 authentication(로그인)을 진행한다.
router.post('/login', (req, res, next) => {
    let errors = { };
    let isValid = true;
    if (!req.body.username) {
        isValid = false;
        errors.username = "Username is required!";
    }
    if (!req.body.password) {
        isValid = false;
        errors.password = "Password is required!";
    }
    if (isValid) {
        next();
    } else {
        req.flash('errors', errors);
        res.redirect('/login');
    }
}, passport.authenticate('local-login', {
    successRedirect: '/',
    failureRedirect: '/login',
   })
);

// Logout
// logout route - passport에서 제공된 req.logout 함수를 사용, 로그아웃하고 '/'로 리다이렉트한다.
router.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});




module.exports = router;


// private functions

// sortConditionPosts() - 요소로 sort 조건을 받아 posts를 생성 후 콜백함수로 넘겨주는 함수
// 공통조건을 추가하거나 변경 또는 삭제 시 posts의 출력형태를 바꿀 수 있다.
function sortConditionPosts(sortCondition, callback) {
    Post.find({})
        .populate('author')
        .sort(sortCondition)
        .limit(5)
        .exec((err, posts) => {
            if (err) callback(err);
            callback(null, posts);
        });
}