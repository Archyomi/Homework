const http = require('http');
const fs = require('fs');
const socketIO = require('socket.io');
const mysql = require('mysql');

const httpServer = http.createServer((req, res) => {
    fs.readFile(`www${req.url}`, (err, data)=>{
        if (err) {
            fs.readFile(`www/404.html`, (err, data)=>{
                res.writeHeader(404);
                if (err) {
                    res.write('服务器错误');
                } else {
                    res.write(data);
                }
                res.end();
            });
        } else {
            res.writeHeader(200);
            res.write(data);
            res.end();
        }

    });
});

let db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: '2017-11-14'
});

let onlineSockets = [];

const ioServer = socketIO.listen(httpServer);
ioServer.on('connection', socket=>{
    console.log('连接成功');
    onlineSockets.push(socket);
    let currUsername = '';

    socket.on('register', (username, password)=>{
        db.query(`SELECT id FROM user WHERE username='${username}'`, (err, data)=>{
            if (err) {
                console.log(err);
                socket.emit('msg_register_result', 1, '服务器错误');
            } else if (data.length >0){
                socket.emit('msg_register_result', 1, '用户名已存在')
            } else {
                db.query(`INSERT INTO user(username, password) VALUES('${username}', '${password}')`, err=>{
                    if (err) {
                        console.log(err);
                        socket.emit('msg_register_result', 1, '服务器错误');
                    } else {
                        socket.emit('msg_register_result', 0, '注册成功');
                    }
                });
            }
        });
    });

    socket.on('login', (username, password)=>{
        db.query(`SELECT id, password FROM user WHERE username='${username}'`, (err, data)=>{
            if (err) {
                socket.emit('msg_login_result', 1, '服务器错误');
            } else if (data.length == 0 || data[0].password != password){
                socket.emit('msg_login_result', 1, '用户名或密码错误');
            } else {
                socket.emit('msg_login_result', 0, '登录成功');
                currUsername = username;
            }
        });
    });

    socket.on('send', msg=>{
        if (msg) {
            onlineSockets.forEach(onlineSocket=>{
                if (onlineSocket == socket) {
                    return;
                }
                onlineSocket.emit('send', currUsername, msg);
            });
            socket.emit('msg_send_result', 0, msg);
        } else {
            socket.emit('msg_send_result', 1, '不能为空');
        }
    });

});

httpServer.listen(8081);
