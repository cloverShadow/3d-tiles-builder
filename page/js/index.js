'use strict';
let ipc = require('electron').ipcRenderer;
let sourcePath = '';
let outPath = '';

//最小化事件
document.getElementsByClassName('icon icon-minimize')[0].onclick = function () {
    ipc.send('mainWindow-min');
};
//关闭事件
document.getElementsByClassName('icon icon-closed')[0].onclick = function () {
    ipc.send('mainWindow-close');
};

//选择输入目录
document.getElementsByClassName('source-file')[0].onclick = function () {
    ipc.send('select-source-directory');
};

//获取输入目录
ipc.on('select-source-directory-finish', function (event, path) {
    sourcePath = path[0];
    let pathArray = path[0].split('\\');
    document.getElementById('source-string').innerHTML = pathArray[0] + '\\' + pathArray[1] + '\\...\\' + pathArray[pathArray.length - 1];
});

//选择输出目录
document.getElementsByClassName('out-file')[0].onclick = function () {
    ipc.send('select-out-directory');
};

//获取输入目录
ipc.on('select-out-directory-finish', function (event, path) {
    outPath = path[0];
    let pathArray = path[0].split('\\');
    document.getElementById('out-string').innerHTML = pathArray[0] + '\\' + pathArray[1] + '\\...\\' + pathArray[pathArray.length - 1];
});

//转换
document.getElementsByClassName('btn btn-primary start-btn')[0].onclick = function () {
    let path = {
        source: sourcePath,
        out: outPath
    };
    ipc.send('to3dtiles', path);
};

//入库（到mongodb）
document.getElementsByClassName('btn btn-primary savedb-btn')[0].onclick = function () {
    let path = {
        source: sourcePath,
        out: outPath
    };
    ipc.send('saved-mongodb', path);
};