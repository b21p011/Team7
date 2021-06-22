/*
    Team7 server js - main | Update: 2021/06/20
    Our project: https://github.com/Fukuda-B/Team7

    Memo:
    https://qiita.com/dojyorin/items/2fd99491f4b459f937a4
    https://http2.try-and-test.net/ecdhe.html
    https://qiita.com/angel_p_57/items/2e3f3f8661de32a0d432
    https://stackoverflow.com/questions/8855687/secure-random-token-in-node-js
    https://ameblo.jp/reverse-eg-mal-memo/entry-12580058952.html
    https://canvasjs.com/

-----
    用語

    CSRF: Cross-Site Request Forgeries
    CORS: Cross-Origin Resource Sharing
     XSS: Cross Site Scripting

      iv: 初期化ベクトル (initialization vector)
     key: 暗号鍵 (key)

    暗号化 ⇔ 復号 (復号化ではない)
    パティング: 暗号アルゴリズムによるが、データ長はある値の倍長である必要があるときに余分な追加される
    サイドチャネル攻撃
*/

'use strict'
const express = require('express');
const passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy;
const router = express.Router();
const fs = require('fs');
const CRYP = require('./cryp.js').CRYP;
const get_key = require('./cryp.js').get_key;

var key_timeout = 7777; // ms

// Update the encryption key periodically.
var bank = CRYP.key_gen();
var update_iv = () => {
    bank.iv = CRYP.iv_v_gen();
    setTimeout(update_iv, key_timeout);
}
update_iv();

// Passport
passport.use(new LocalStrategy({
        usernameField: "username",
        passwordField: "password",
    },
    (username, password, done) => {
        var user = CRYP.decryptoo(username, bank),
            // pass = CRYP.decryptoo(password, bank);
            pass = password

        console.log('--------------------');
        console.log({"user":username, "pass":password});
        console.log({"user":user, "pass":password});
        console.log('--------------------');

        if (check_user(user, pass)) {
            return done(null, user);
        } else {
            return done(null, false);
        }
    }
));
router.use(passport.initialize());
router.use(passport.session());
passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((user, done) => {
    done(null, user);
});


// Request
router
    // GET req
    .get('/', (req, res) => { // トップページ
        if (isAuthenticated_bool(req, res)) {
            res.render('index', {
                title: 'Team7',
                top_bar_link: '/main',
                top_bar_text: '<i class="fas fa-user"></i> My Page'
            });
        } else {
            res.render('index', {
                title: 'Team7',
                top_bar_link: '/main',
                top_bar_text: 'Sign in <i class="fas fa-sign-in-alt"></i>'
            });
        }
    })

    .get('/main', // メインページ
        isAuthenticated,
        (req, res) => {
            switch(req.query.p) {
                case 'course': // /main?p=course
                var tx = '<a href="/main?p=course">個別ページへ<i class="fas fa-file-alt"></i></i></a>';
                var out_table = createTable(req.user, tx);
                res.render('course', {
                        title: 'Team7 - コース',
                        lecture_table: out_table,
                        user_id: get_user_id(req.user),
                        top_bar_link: '/main/logout',
                        top_bar_text: 'Sign out <i class="fas fa-sign-out-alt"></i>',
                        dashboard_menu_class: ["dash_li", "dash_li dash_li_main", "dash_li", "dash_li", "dash_li"]
                    });
                    break;
                case 'edit': // /main?p=edit
                    var tx = '<a href="/main?p=edit">編集<i class="fas fa-pencil-alt"></i></a>';
                    var out_table = createTable(req.user, tx);
                    res.render('edit', {
                        title: 'Team7 - 編集',
                        lecture_table: out_table,
                        user_id: get_user_id(req.user),
                        top_bar_link: '/main/logout',
                        top_bar_text: 'Sign out <i class="fas fa-sign-out-alt"></i>',
                        dashboard_menu_class: ["dash_li", "dash_li", "dash_li dash_li_main", "dash_li", "dash_li"]
                    });
                    break;
                case 'stat': // /main?p=stat
                    res.render('stat', {
                        title: 'Team7 - 統計',
                        lecture_table: createTable(req.user, ''),
                        lecture_graph_val: get_graph_val(req.user),
                        user_id: get_user_id(req.user),
                        top_bar_link: '/main/logout',
                        top_bar_text: 'Sign out <i class="fas fa-sign-out-alt"></i>',
                        dashboard_menu_class: ["dash_li", "dash_li", "dash_li", "dash_li dash_li_main", "dash_li"]
                    });
                    break;
                case 'dev': // /main?p=dev
                    var user_list = JSON.parse(fs.readFileSync('./routes/user_data.json', 'utf8'));
                    res.render('dev', {
                        title: 'Team7 - 開発者向け',
                        lecture_table: createTable(req.user, ''),
                        user_id: get_user_id(req.user),
                        top_bar_link: '/main/logout',
                        top_bar_text: 'Sign out <i class="fas fa-sign-out-alt"></i>',
                        dashboard_menu_class: ["dash_li", "dash_li", "dash_li", "dash_li", "dash_li dash_li_main"],
                        webapi_key: get_key(user_list[req.user])
                    });
                    break;
                default: // default (main?p=home)
                    var tx = '<a href="/main"><i class="fas fa-file-csv"></i>csv</a>'
                    + '<a href="/main"><i class="fas fa-file-excel"></i>xlsx</a>';
                    var out_table = createTable(req.user, tx)
                    +'</td><td>一括保存</td><td></td><td></td><td></td><td></td>'
                    +'<td id="td_dl">'
                    +'<a href="/main"><i class="fas fa-file-download"></i>csv</a>'
                    +'<a href="/main"><i class="fas fa-file-download"></i>xlsx</a>'
                    +'</td></tr>';
                    res.render('home', {
                        title: 'Team7 - マイページ',
                        lecture_table: out_table,
                        user_id: get_user_id(req.user),
                        top_bar_link: '/main/logout',
                        top_bar_text: 'Sign out <i class="fas fa-sign-out-alt"></i>',
                        dashboard_menu_class: ["dash_li dash_li_main", "dash_li", "dash_li", "dash_li", "dash_li"]
                    });
                    break;
            }
    })
    .get('/main/logout', (req, res) => { // ログアウト処理
        req.logout();
        res.redirect('/');
    })
    .get('/main/login', (req, res, next) => { // ログイン処理
            if (req.isAuthenticated()) { // 認証済み
                res.redirect('/main');
            } else {
                next();
            }
        },
        (req, res) => { // 未認証
            res.render('login', {
                title: 'Team7 | Login',
                crypto_bank: bank,
                top_bar_link: '',
                top_bar_text: ''
            });
        }
    )

    // POST req
    .post('/main/u', function (req, res) { // 認証用 iv
        res.send(bank.iv);
    })
    .post('/main/logout', (req, res) => { // ログアウト処理
        req.logout();
        res.redirect('/');
    })
    .post('/main/login',
        passport.authenticate('local', { // 認証処理
            successRedirect : '',
        }),
        (req, res) => {
            res.send('/main');
        }
    );


// ----- 認証済みか確認する関数 -----
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.redirect('/main/login'); // ログインページへリダイレクト
    }
}

// ----- 認証済みか確認する関数 戻り値はbool -----
function isAuthenticated_bool(req, res) {
    return req.isAuthenticated();
}

// ----- 出席状況のテーブル生成 -----
// txは一番右の列の表示内容
function createTable(user, tx) {
    var jsonFile = './routes/user_json.json';
    var lecture_json = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    var json = lecture_json[user];

        var table = '';
    for (var tmp of json.lecture) {
        table += '<tr><td>'+tmp.lecture_name
        +'</td><td>'+tmp.lecture_date.f+' '
        +tmp.lecture_date.w+' '
        +tmp.lecture_date.t
        +'</td><td>'+tmp.lecture_teach // 担当
        +'</td><td>'+tmp.lecture_cnt // 出席数
        +'</td><td>'+'---' // なにか
        +'</td><td id="td_dl"> '
        +tx
        // +'<a href="/main"><i class="fas fa-file-csv"></i>csv</a>'
        // +'<a href="/main"><i class="fas fa-file-excel"></i>xlsx</a>'
        +'</td></tr>'; // end
    }
    return table;
}

// ----- グラフ出力に必要なデータ生成 -----
function get_graph_val(user) {
    var jsonFile = './routes/user_json.json';
    var lecture_json = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    var json = lecture_json[user];
    var data = new Array();
    for (var i=0; i<json.lecture.length; i++) {
        data[i] = {
            "label": json.lecture[i].lecture_name,
            "y": json.lecture[i].lecture_cnt
        }
    }
    return data;
}

// ----- ユーザ名からUIDを取得する -----
function get_user_id(user) {
    var user_list = JSON.parse(fs.readFileSync('./routes/user_data.json', 'utf8'));
    return user_list[user].UID;
}

// ----- ユーザ確認 -----
function check_user(user, pass) {
    try {
        var user_list = JSON.parse(fs.readFileSync('./routes/user_data.json', 'utf8'));
        return (user === user_list[user].username && pass === user_list[user].password);
        // return (user === userB.username);
    } catch {
        return false;
    }
}

// -----

module.exports = router;
