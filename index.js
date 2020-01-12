const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('./config/passport');
// .env안의 키 가져오기
require('dotenv').config();

const app = express();

// DB setting
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect(process.env.MONGO_DB);
let db = mongoose.connection;
db.once('open', () => {
    console.log("DB Connected!");
});
db.on('error', err => {
    console.log("DB ERROR: ", err);
});

// Other setting
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
// req.flash라는 함수를 사용가능하게 된다.
// req.flash(문자열, 저장할값) 의 형태로 저장할값(숫자, 문자열, 오브젝트등 어떠한 값이라도 가능)을
// 해당 문자열에 저장한다.
// 이떄 flash는 배열로 저장되기 때문에 같은 문자열을 중복해서 사용하면 순서대로 배열로 저장이 된다.
// req.flash(문자열) 인 경우 해당 문자열에 저장된 값들을 배열로 불러온다. 
// 저장된 값이 없다면 빈 배열을 리턴한다.
app.use(flash());
// session은 서버에서 접속자를 구분시키는 역할을 한다. 
// user1과 user2가 웹사이트를 보고 있는 경우, 해당 user들을 구분하여 
// 서버에서 필요한 값들(예를들어 로그인 상태 정보 등)을 따로 관리하게 된다.
// flash에 저장되는 값 역시 user1이 생성한 flash는 user1에게, user2가 생성한 flash는 user2에게
// 보여져야 하기 때문에 session이 필요하다.
// 옵션부분의 secret은 hash를 생성하는데 사용되는 값이다.
app.use(session({ secret: process.env.SESSION_SECRET, resave: true, saveUninitialized: true }));


// Passport
// passport.initialize() 는 패스포트를 초기화 시켜주는 함수,
// passport.session() 는 passport를 session과 연결해주는 함수
app.use(passport.initialize());
app.use(passport.session());

// Custom Middlewares
// req.isAuthenticated()는 passport에서 제공하는 함수로, 
// 현재 로그인이 되어있는지 아닌지를 true 또는 false로 return한다.
// req.user는 passport에서 추가하는 항목으로 
// 로그인이 되면 session으로 부터 user를 deserialize하여 생성한다.
// req.locals에 위 두가지를 담는데, req.locals에 담겨진 변수는 ejs에서 바로 사용가능하다.
// req.locals.isAuthenticated는 ejs에서 user가 로그인이 되어 있는지 아닌지를 확인하는데 사용되고, 
// req.locals.currentUser는 로그인된 user의 정보를 불러오는데 사용된다.
app.use((req, res, next) => {
    res.locals.isAuthenticated = req.isAuthenticated();
    res.locals.currentUser = req.user;
    next();
});


// Routes
app.use('/', require('./routes/home'));
app.use('/posts', require('./routes/posts'));
app.use('/users', require('./routes/users'));

// Port setting
const PORT = 3000;
app.listen(PORT, () => {
    console.log("Server On! - localhost:" + PORT);
});