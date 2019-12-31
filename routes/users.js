
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Index
// User.find에는 찾을 조건 ({}=모든 값)이 들어가고, 
// sort함수를 넣어주기 위해서 callback 함수없이 괄호가 닫혔다.
// sort함수에는 {username:1}이 들어가서 username을 기준으로 오름차순으로 정렬한다.(-1일 경우 내림차순)
// callback 함수가 find 함수 밖으로 나오게 되면, exec(callback)을 사용한다. 
router.get('/', (req, res) => {
    User.find({})
        .sort({ username:1 })
        .exec((err, users) => {
            if (err) return res.json(err);
            res.render('users/index', { users:users });
        });
});

// New
router.get('/new', (req, res) => {
    res.render('users/new', { user:{} });
});

// Create
router.post('/', (req, res) => {
    User.create(req.body, (err, user) => {
        if (err) return res.json(err);
        res.redirect('/users');
    });
});

// Show
router.get('/:username', (req, res) => {
    User.findOne({ username:req.params.username }, (err, user) => {
        if (err) return res.json(err);
        res.render('users/show', { user:user });
    });
});

// Edit
router.get('/:username/edit', (req, res) => {
    User.findOne({ username:req.params.username }, (err, user) => {
        if (err) return res.json(err);
        res.render('users/edit', { user:user });
    });
});

// Update
// 이 코드에서는 findOneAndUpdate 대신에 findOne으로 값을 찾은 후에 값을 수정하고 user.save 함수로 값을 저장한다
// 단순히 값을 바꾸는 것이 아니라 user.password를 조건에 맞게 바꿔주어야 하기 때문이다.
// select 함수를 이용하면 DB에서 어떤 항목을 선택할지, 안할지를 정할 수 있다.
// user schema 에서 password의 select를 false로 설정해서 DB에 password가 있더라도 기본적으로
// password를 읽어오지 않게 되는데, select 함수로 password 항목을 선택한다.
// 참고로 select 함수로 기본적으로 읽어오게 되어 있는 항목을 안 읽어오게 할 수도 있는데
// 이때는 항목이름 앞에 '-'를 붙이면 된다.
// 또한 하나의 select 함수로 여러 항목을 동시에 정할 수 도 있는데 
// 예를들어 password를 읽어오고, name을 안 읽어오려면 .select('password -name')으로 설정하면 된다.
router.put('/:username', (req, res, next) => {
    User.findOne({ username:req.params.username })
        .select('password')
        .exec((err, user) => {
            if (err) return res.json(err);

            // update user object
            user.originalPassword = user.password;
            // user의 update는 두가지로 나눌 수 있는데
            // 1. password를 업데이트 하는 경우
            // 2. password를 업데이트 하지 않는 경우
            // 에 따라 user.password의 값이 바뀐다.
            user.password = req.body.newPassword? req.body.newPassword : user.password;
            
            // user는 DB에서 읽어온 data이고, req.body가 실제 form으로 입력된 값이므로 각 항목을 덮어쓰는부분이다.
            for (var p in req.body) {
                user[p] = req.body[p];
            }
            // save updated user
            user.save((err, user) => {
                if (err) return res.json(err);
                res.redirect('/users/' + req.params.username);
            });
        });
});


module.exports = router;