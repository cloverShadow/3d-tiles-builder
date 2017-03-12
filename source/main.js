'use strict';
const {app, BrowserWindow} = require('electron');
const electron = require('electron');
const ipc = electron.ipcMain;
const dialog = electron.dialog;
const path = require('path');
const url = require('url');
const fs = require('fs');
const glb2b3dm = require('./glb2b3dm');
const cp = require('./cp');
const obj2gltf = require('obj2gltf');
const convert = obj2gltf.convert;

// 保持一个对于 window 对象的全局引用，如果你不这样做，
// 当 JavaScript 对象被垃圾回收， window 会被自动地关闭
let win;

function createWindow() {
    // 创建浏览器窗口。
    win = new BrowserWindow({
        width: 400,//窗口宽度
        height: 300,//窗口高度
        frame: false,
        resizable: false,
        title: "3d-tiles",
        show: true,//是否显示界面 先设置否
        //icon:'3.ico',
        hasShadow: true
    });

    // 加载应用的 index.html。
    win.loadURL(url.format({
        pathname: path.join(__dirname, '../page/page.html'),
        protocol: 'file:',
        slashes: true
    }));


    win.webContents.on('did-finish-load', function () {
        win.show();
    });

    // 打开开发者工具。
    // win.webContents.openDevTools();

    // 当 window 被关闭，这个事件会被触发。
    win.on('closed', () => {
        // 取消引用 window 对象，如果你的应用支持多窗口的话，
        // 通常会把多个 window 对象存放在一个数组里面，
        // 与此同时，你应该删除相应的元素。
        win = null;
    });

    ipc.on('mainWindow-min', () => {
        win.minimize();
    });

    ipc.on('mainWindow-close', () => {
        app.quit();
    });

    //选择输入目录并返回
    ipc.on('select-source-directory', (event) => {
        dialog.showOpenDialog({
            properties: ['openFiles']
        }, function (files) {
            if (files) {
                event.sender.send('select-source-directory-finish', files);
            }
        })
    });

    //选择输出目录并返回
    ipc.on('select-out-directory', (event) => {
        dialog.showOpenDialog({
            properties: ['openDirectory']
        }, function (files) {
            if (files) {
                event.sender.send('select-out-directory-finish', files);
            }
        })
    });

    //转换为3dtiles
    ipc.on('to3dtiles', (event, data) => {
        convert(data.source, path.join(data.out, 'out.gltf'), {
            binary: false
        }).then(function () {
            console.log('gltf done!');
            convert(data.source, path.join(data.out, 'out.glb'), {
                binary: true
            }).then(function () {
                console.log('glb done!');
                fs.readFile(path.join(data.out, 'out.glb'), function (err, tiles) {
                    if (err) throw err;
                    let b3dm = glb2b3dm(tiles);
                    let p = path.join(data.out, 'out.b3dm');
                    fs.writeFile(p, b3dm, function (err) {
                        if (err) throw err;
                        console.log("b3dm done!");
                        //4.gltf读取包围范围
                        fs.readFile(path.join(data.out, 'out.gltf'), function (err, tileset) {
                            if (err) throw err;
                            let json = JSON.parse(tileset);
                            let result = cp(json);
                            let tilesetJson = {
                                "asset": {
                                    "version": "0.0"
                                },
                                "geometricError": 10,
                                "root": {
                                    "boundingVolume": {
                                        "sphere": [
                                            0,
                                            0,
                                            0,
                                            result.radius
                                        ]
                                    },
                                    "geometricError": 10,
                                    "refine": "replace",
                                    "content": {
                                        "url": "./out.b3dm"
                                    }
                                }
                            };
                            tilesetJson = JSON.stringify(tilesetJson);
                            fs.writeFile(path.join(data.out, 'tileset.json'), tilesetJson, function (err) {
                                if (err) throw err;
                                console.log('tileset done!');
                            })
                        });
                    });
                })
            })
        })
    });

    //存储数据到mongodb
    ipc.on('saved-mongodb', (event, data) => {
        //1.整个tileset打包为gzip迁移到sqlite3
        
        //2.从sqlite3数据迁移到mongodb
    })
}

// Electron 会在初始化后并准备
// 创建浏览器窗口时，调用这个函数。
// 部分 API 在 ready 事件触发后才能使用。
app.on('ready', createWindow);

// 当全部窗口关闭时退出。
app.on('window-all-closed', () => {
    // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
    // 否则绝大部分应用及其菜单栏会保持激活。
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', () => {
    // 在这文件，你可以续写应用剩下主进程代码。
    // 也可以拆分成几个文件，然后用 require 导入。
    if (win === null) {
        createWindow();
    }
});