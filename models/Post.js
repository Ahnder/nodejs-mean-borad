const mongoose = require('mongoose');
const util = require('../util');

// schema
// Post의 schema는 title, body, createdAt, updatedAt 으로 구성
// default 항목으로 기본 값을 지정할 수 있다. 함수명을 넣으면 해당 함수의 return이 기본값이 된다.
// Date.now 는 현재 시간을 리턴하는 함수
let postSchema = mongoose.Schema({
        title: { type: String, require: true, },
        body: { type: String, },
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, },
        // 조회수(views)와 글번호(numId) 추가
        views: { type: Number, default: 0, },
        numId: { type: Number, required: true, },
        // 댓글(comments) 추가
        // NoSQL DB는 배열을 저장할 수 있다.
        // SQL DB라면 게시글과 댓글은 테이블을 따로 빼서 만들어야 하지만
        // NoSQL DB는 댓글을 그냥 게시글 데이터에 입력해서 사용가능하다.
        // 똑같은 게시글-댓글 상황이라도 이 데이터들을 가지고 뭘 할지에 따라서 배열로 넣는것이 
        // 좋을 수 있고 아닐 수 있는데 이 게시판에서는 어차피 게시글을 읽어올때 
        // 댓글은 반드시 읽어와야 하는 데이터기 때문에 배열로 만들었다.
        comments: [{ 
                body: { type: String, required: true, },
                author: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, },
                createdAt: { type: Date, default: Date.now, },
         }],
        createdAt: { type: Date, default: Date.now, },
        updatedAt: { type: Date, },
}, {toObject: { virtuals: true, }}); // virtual들을 object에서 보여주는 mongoose schema의 option


// virtuals
// postSchema.virtual 함수를 이용해서 virtuals(가상항목들)을 설정
// virtuals는 실제 DB에 저장되진 않지만 model에서는 db에 있는 다른 항목들과 동일하게 사용할 수 있는데,
// get, set함수를 설정해서 어떻게 해당 virtual 값을 설정하고 불러올지를 정할 수 있다.
// createdAt, updatedAt 은 Date 타입으로 설정되어 있는데 javascript는 Date 타입에
// formatting 기능(시간을 어떠한 형식으로 보여줄지 정하는 것, 예를들어 17-10-03 or 10-03-17)을
// 따로 설정해주어야 하기 때문에 아래 코드와 같은 방식으로 설정
postSchema.virtual('createdDate')
          .get(function() { return util.getDate(this.createdAt); });

postSchema.virtual('createdTime')
          .get(function() { return util.getTime(this.createdAt); });

postSchema.virtual('updatedDate')
          .get(function() { return util.getDate(this.updatedAt); });

postSchema.virtual('updatedTime')
          .get(function() { return util.getTime(this.updatedAt); });


// model & export
let Post = mongoose.model('post', postSchema);
module.exports = Post;


// functions
//function getDate(dateObj) {
//    if (dateObj instanceof Date)
//        return dateObj.getFullYear() + "-" + 
//               get2digits(dateObj.getMonth() + 1) + "-" +
//               get2digits(dateObj.getDate());
//}

//function getTime(dateObj) {
//    if (dateObj instanceof Date)
//        return get2digits(dateObj.getHours()) + ":" +
//               get2digits(dateObj.getMinutes()) + ":" +
//               get2digits(dateObj.getSeconds());
//}

//function get2digits(num) {
//    return ("0" + num).slice(-2);
//}