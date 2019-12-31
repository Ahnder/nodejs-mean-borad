const mongoose = require('mongoose');

// schema
// required 에 배열을 설정하였다. 첫 번째는 boolean 값이고, 두 번째는 에러메세지이다.
// 배열대신 그냥 true를 설정하는 경우는 기본 에러메시지를 출력하고,
// 배열을 사용하는 경우 custom 에러메시지를 생성할 수 있다.
// password에는 select: false 가 추가되었다. 기본설정은 자동으로 select: true 인데,
// schema 항목을 DB에서 읽어온다.
// select: false 로 설정하면 DB에서 값을 읽어 올때, 해당 값을 읽어오라고 하는 경우에만
// 값을 읽어오게 된다. 비밀번호는 중요하기 때문에 기본적으로 DB에서 값을 읽어오지 못하게 설정했다.
// 값을 읽어오는 방법은 아래 route부분에 설정하였다.
let userSchema = mongoose.Schema({
    username: {
        type: String, 
        required: [true, "Username is required!"],
        unique: true,
    },
    password: {
        type: String,
        required: [true, "Password is required!"],
        select: false,
    },
    name: {
        type: String,
        required: [true, "Name is required!"],
    },
    email: {
        type: String,
    },
}, { 
    toObject: { virtuals: true }
});

// virtuals
// DB에 저장되는 값은 password 인데 회원가입, 정보 수정 시에는 이 값들이 필요하다.
// DB에 저장되지 않아도 되는 정보들은 virtual로 만들어준다.
userSchema.virtual('passwordConfirmation')
          .get(function() { return this._passwordConfirmation; })
          .set(function(value) { this._passwordConfirmation=value; });

userSchema.virtual('originalPassword')
          .get(function() { return this._originalPassword; })
          .set(function(value) { this._originalPassword=value; });

userSchema.virtual('currentPassword')
          .get(function() { return this._currentPassword; })
          .set(function(value) { this._currentPassword=value; });

userSchema.virtual('newPassword')
          .get(function() { return this._newPassword; })
          .set(function(value) { this._newPassword=value; });

// password validation
// DB에서 정보를 생성, 수정하기 전에 mongoose가 값이 유효(valid)한지 확인(validate)을 하게 되는데
// password 항목에 custom validation 함수를 지정할 수 있다.
// virtual들은 직접 validation이 안되기 때문에 password 에서 값을 확인하도록 한다.
userSchema.path('password')
          .validate(function(v) {
              let user = this; // validation callback 함수 속에서 this는 user model 이다.
              
              // create user
              // model.isNew 항목이 true면 새로 생긴 model(DB에 한번도 기록되지 않았던 model)
              // 즉 새로 생성되는 user이며, 값이 false이면 DB에서 읽어 온 model, 
              // 즉 기존회원정보를 수정하는 경우이다.
              // 회원가입의 경우 password confirmation 값이 없는 경우, password와 password confirmation값이
              // 다른 경우에 유효하지않음처리(invalidate)를 하게 된다.
              // model.invalidate 함수를 사용하며, 첫 번째는 인자로 항목이름, 두 번째 인자로 에러메시지를 받는다. 
              if (user.isNew) {
                  if (!user.passwordConfirmation) {
                      user.invalidate('passwordConfirmation', "Password Confirmation is required!");
                  }
                  if (user.password !== user.passwordConfirmation) {
                      user.invalidate('passwordConfirmation', "Password Confirmation does not matched!");
                  }
              }
              // update user
              // 회원정보 수정의 경우 
              // 1. current password 값이 없는 경우,
              // 2. current password 값이 original password 랑 다른 경우,
              // 3. new password 와 password confirmation 값이 다른 경우
              // invalidate 한다.
              // 회원정보 수정 시에는 항상 비밀번호를 수정하는 것은 아니기 때문에
              // new password 와 password confirmation 값이 없어도 에러는 아니다.
              if (!user.isNew) {
                  if (!user.currentPassword) {
                      user.invalidate('currentPassword', "Current Password is required!");
                  }
                  if (user.currentPassword !== user.originalPassword) {
                      user.invalidate('currentPassword', "Current Password is invalid!");
                  }
                  if (user.newPassword !== user.passwordConfirmation) {
                      user.invalidate('passwordConfirmation', "password Confirmation does not matched!");
                  }
              }
});


let User = mongoose.model('user', userSchema);
module.exports = User;