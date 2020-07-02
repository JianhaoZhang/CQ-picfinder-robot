import config from '../config';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import Path from 'path';
import async from 'async';

const sqlPath = Path.resolve(__dirname, '../../data/tdb.sqlite');

/**
 * 得到当前时间戳
 *
 * @returns 当前时间戳（秒）
 */
function getDateSec() {
    return Math.floor(Date.now() / 1000);
}

/**
 * Picfinder数据库
 *
 * @class PFSqlite
 */
class TSqlite {
    /**
     * 连接数据库
     * @memberof TSqlite
     */
    constructor() {
        this.ready = false;
        this.sql = null;
        this.interval = null;
        (async () => {
            this.sql = await open({
                filename: sqlPath,
                driver: sqlite3.Database,
            });
            await this.sql.run('CREATE TABLE IF NOT EXISTS `subscribed` ( `uid` TEXT NOT NULL, PRIMARY KEY (`uid`));');
            await this.sql.run('CREATE TABLE IF NOT EXISTS `feed` (`imgurl` TEXT NOT NULL , `tweeturl` TEXT NOT NULL , `username` TEXT NOT NULL , `likes` INT NOT NULL, `t` TEXT NOT NULL, PRIMARY KEY (`tweeturl`));');
            this.ready = true;
        })().catch(e => {
            console.error(`${new Date().toLocaleString()} [error] SQLite`);
            console.error(e);
        });
    }
    /**
     * 关闭数据库连接
     *
     * @memberof PFSqlite
     */
    close() {
        if (!this.ready) return;
        return this.sql.close();
    }

    /**
     * 增加或更新缓存记录
     *
     * @param {string} img 图片文件名
     * @param {number} db 搜索库
     * @param {object} msg 消息
     * @returns Promise
     * @memberof PFSqlite
     */
    addTuple(imgurl, tweeturl, username, likes) {
        (async () => {
            var sql = await open({
                filename: sqlPath,
                driver: sqlite3.Database,
            });
            await sql.run('REPLACE INTO `feed` (`imgurl`, `tweeturl`, `username`, `likes`, `t`) VALUES (?, ?, ?, ?, ?)', [imgurl, tweeturl, username, likes, getDateSec()]);
        })().catch(e => {
            console.error(`${new Date().toLocaleString()} [error] SQLite`);
            console.error(e);
            return e;
        });
        return;
    }

    addUser(uid) {
        (async () => {
            this.sql = await open({
                filename: sqlPath,
                driver: sqlite3.Database,
            });
            await this.sql.run('REPLACE INTO `subscribed` (`uid`) VALUES (?)', [uid]);
            return true;
        })().catch(e => {
            console.error(`${new Date().toLocaleString()} [error] SQLite`);
            console.error(e);
        });
        return false;
    }

    /**
     * 得到缓存记录
     *
     * @param {string} img 图片文件名
     * @param {number} db 搜索库
     * @returns
     * @memberof PFSqlite
     */
    async getTuple(imgurl) {
        (async () => {
            this.sql = await open({
                filename: sqlPath,
                driver: sqlite3.Database,
            });
            let result = await this.sql.run('SELECT * from `feed` WHERE imgurl=?', [imgurl]);
            return result;
        })().catch(e => {
            console.error(`${new Date().toLocaleString()} [error] SQLite`);
            console.error(e);
        });
        return false;
    }

    async getUsers() {
        (async () => {
            this.sql = await open({
                filename: sqlPath,
                driver: sqlite3.Database,
            });
            let query = 'SELECT * from `subscribed`';
            this.sql.each(query, (err, row) => {
                if (err){
                    throw err;
                }
                console.log(`${row.uid}`);
            });
            return true;
        })().catch(e => {
            console.error(`${new Date().toLocaleString()} [error] SQLite`);
            console.error(e);
        });
        return false;
    }

}

export default TSqlite;