// 원래 routes/users.js에 있던parseError와 model/Post.js에 있던 
// 시간관련 함수들을 module로 만들어 util.js로 분리
let util = {};

util.parseError = function(errors) {
    let parsed = {};
    if (errors.name == 'ValidationError') {
        for (var name in errors.errors) {
            let validationError = errors.errors[name];
            parsed[name] = { message: validationError.message };
        }
    } else if (errors.code == '11000' && errors.errmsg.indexOf('username') > 0) {
        parsed.username = { message: "This username already exists!" };
    } else {
        parsed.unhandled = JSON.stringify(errors);
    }
    return parsed;
};

util.getDate = function(dateObj) {
    if (dateObj instanceof Date) {
        return dateObj.getFullYear() + '-' + get2digits(dateObj.getMonth() + 1) + '-' 
               + get2digits(dateObj.getDate()); 
    }
};

util.getTime = function(dateObj) {
    if (dateObj instanceof Date) {
        return get2digits(dateObj.getHours()) + ':' + get2digits(dateObj.getMinutes()) + ':'
               + get2digits(dateObj.getSeconds()); 
    }
};

// isLoggedIn은 사용자가 로그인이 되었는지 아닌지를 판단하여 로그인이 되지 않은 경우 
// 사용자를 에러 메세지("Please Login First")와 함께 로그인 페이지로 보내는 함수
// route 에서 callback 으로 사용될 함수이므로 req, res, next를 받는다.
// 로그인이 된 상태라면 다음 callback 함수를 호출하게 되고 
// 로그인이 안된 상태라면 로그인페이지로 redirect 한다.
util.isLoggedIn = function(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        req.flash('errors', { login: "Please Login First" });
        res.redirect('/login');
    }
}

// noPermission은 어떠한 route에 접근권한이 없다고 판단된 경우에 호출되어 
// 에러메시지와 함께 로그인 페이지로 보내는 함수
// req, res가 있지만 callback으로 사용하지는 않고
// 일반 함수로 사용할 예정, isLoggedin과 다르게 접근권한이 있는지 없는지를 판단하지는 않는데, 
// 상황에 따라서 판단 방법이 다르기 때문
util.noPermission = function(req, res) {
    req.flash('errors', { login: "You don't have permission" });
    req.logout();
    res.redirect('/login');
};


module.exports = util;

// private functions
function get2digits(num) {
    return ("0" + num).slice(-2);
}