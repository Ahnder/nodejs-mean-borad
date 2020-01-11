const express = require('express');
const router = express.Router();
const passport = require('../config/passport');

// Home
router.get('/', (req, res) => {
    res.render('home/welcome');
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