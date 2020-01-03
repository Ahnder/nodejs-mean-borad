const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

// serialize & deserialize
// passport.serializeUser 는 login 시에 
// DB 에서 발견한 user를 어떻게 저장할지를 정하는 부분이다.
// user정보 전체를 session에 저장할 수도 있지만,
// session에 저장되는 정보가 너무 많아지면 사이트의 성능이 떨어질 수 있고,
// user object가 변경되면 변경된 부분이 반영되지 못하므로 user의 id만 session에 저장한다.
passport.serializeUser((user, done) => {
    done(null, user.id);
});
// passport.deserializeUser는 request시에 session에서 어떻게 user object를 만들지를 정하는 부분이다.
// 매번 request마다 user정보를 db에서 새로 읽어오는데, 
// user가 변경되면 바로 변경된 정보가 반영되는 장점이 있다.
// 다만 매번 request마다 db를 읽게되는 단점이 있는데 선택은 상황에 맞게 하면된다.
passport.deserializeUser((id, done) => {
    User.findOne({_id:id}, (err, user) => {
        done(err, user);
    });
});

// local strategy setting
// 만약 로그인 form의 username과 password항목의 이름이 다르다면 여기에서 값을 변경해 주면 된다.
// ex) 로그인 form의 항목이름이 email, pass 라면 usernameField: 'email', passwordField: 'pass'로 설정한다
passport.use('local-login', 
    new LocalStrategy({
        usernameField: 'username',
        passwordField: 'password',
        passReqToCallback: true,
    },
    // 3-2
    // 로그인시에 이 함수가 호출된다. DB에서 해당 user를 찾고, user model에 설정했던
    // user.athenticate 함수를 사용해서 입력받은 password와 저장된 password hash를 비교해서
    // 값이 일치하면 해당 user를 done에 담아서 return 하고 - (return done(null, user);),
    // 그렇지 않은 경우 username flash와 에러 flash를 생성한 후 
    // done에 false를 담아 return한다 - (return done(null, false);)
    // user가 전달되지 않으면 local-strategy는 실패(failure)로 간주된다.
    function(req, username, password, done) {
        User.findOne({ username: username })
            .select({ password: 1 })
            .exec((err, user) => {
                if (err) return done(err);
                // user.authenticate(password)는 입력받은 password와 db에서 읽어온
                // 해당 user의 password hash를 비교하는 함수로 bcrypt로 설정되어있다.
                // *done함수의 첫 번째 parameter는 항상 error를 담기 위한 것으로 error가 없다면 null을 담는다.
                if (user && user.authenticate(password)) {
                    return done(null, user);
                } else {
                    req.flash('username', username);
                    req.flash('errors', { login: "Incorrect username or password" });
                    return done(null, false);
                }
            });
    }) 
);


module.exports = passport;