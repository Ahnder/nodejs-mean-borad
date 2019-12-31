
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
// user 생성시에 에러가 있는 경우 new페이지에 에러와 기존에 입력했던 값들을 보여주게 되는데
// 이 값들은 create route에서 생성된 flash로부터 받아온다.
// flash는 array가 오게 되는데 이 앱에서는 하나 이상의 값이 저장되는 경우가 없고,
// 있더라도 오류이므로 무조건 [0]의 값을 읽어오게 코드를 작성했다.
// 값이 없다면(처음 new페이지에 들어온 경우)에는 || {} 를 사용해서 빈 오브젝트를 넣어 user/new페이지를 생성한다.
router.get('/new', (req, res) => {
    let user = req.flash('user')[0] || {};
    let errors = req.flash('errors')[0] || {};
    res.render('users/new', { user:user, errors:errors });
});

// Create
// user 생성시에 오류가 있다면 user, error flash를 만들고 new페이지로 redirect한다.
// user 생성시에 발생할 수 있는 오류는 
// 1. User model의 userSchema에 설정해둔 validation을 통과하지 못한 경우
// 2. mongoDB에서 오류를 내는 경우
// 이때 발생하는 error객체의 형식이 상이하므로 
// parseError()라는 함수를 따로 만들어서 err을 분석하고 일정한 형식으로 만든다.
router.post('/', (req, res) => {
    User.create(req.body, (err, user) => {
        if (err) {
            req.flash('user', req.body);
            req.flash('errors', parseError(err));
            return res.redirect('/users/new');   
        }
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
// edit은 처음 접속하는 경우에는 DB에서 값을 찾아 form에 기본값을 생성하고,
// update에서 오류가 발생해 돌아오는 경우에는 기존에 입력했던 값으로 form에 값들을 생성해야 한다.
// 이를위해 user에는 || {} 를 사용하지 않았고 
// user flash값이 있으면 오류가 있는경우,
// user flash값이 없으면 처음 들어온 경우로 가정하고 진행한다.
// render시에 username을 따로 보내주는데, 이전코드에는 user.username이 항상 
// 해당 user의 username이었지만 이젠 user flash에서 값을 받는 경우 
// username이 달라 질 수 있기 때문에 주소에서 찾은 username을 따로 보내주게 된다.
router.get('/:username/edit', (req, res) => {
    let user = req.flash('user')[0];
    let errors = req.flash('errors')[0] || {};
    if (!user) {
        User.findOne({ username:req.params.username }, (err, user) => {
            if (err) return res.json(err);
            res.render('users/edit', { username:req.params.username, user:user, errors:errors });
        });
    } else {
        res.render('users/edit', { username:req.params.username, user:user, errors:errors });
    }
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
                if (err) {
                    req.flash('user', req.body);
                    req.flash('errors', parseError(err));
                    return res.redirect('/users/' + req.params.username + '/edit');
                }
                res.redirect('/users/' + user.username);
            });
        });
});


module.exports = router;


// Functions
// mongoose에서 내는 에러와 mongoDB에서 내는 에러의 형태가 다르기 때문에 이 함수를 통해
// 에러의 형태를 { 항목이름: { message: "에러메시지" } } 로 통일시켜주는 역할을 하는 함수
// if 에서 mongoose의 model validation error를,
// else if 에서 mongoDB의 username이 중복되는 error를
// else 에서 그 외 error들을 처리한다.
// 함수시작부분에 console.log("errors: ", errors)를 추가해주면 원래 에러의 형태를 
// console에서 볼 수 있다.
function parseError(errors) {
    console.log("errors: ", errors)
    let parsed = {};
    if (errors.name == 'ValidationError') {
        for (var name in errors.errors) {
            let validationError = errors.errors[name];
            parsed[name] = { message:validationError.message };
        }
    } else if (errors.code == "11000" && errors.errmsg.indexOf('username') > 0) {
        parsed.username = { message: "This username already exists!" };
    } else {
        parsed.unhandled = JSON.stringify(errors);
    }
    return parsed;
}