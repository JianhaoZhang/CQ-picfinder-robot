import { random } from 'lodash';
import Axios from 'axios';
import config from '../config';
import CQcode from '../CQcode';
import { resolve as resolveURL } from 'url';
import NamedRegExp from 'named-regexp-groups';
import { createCanvas, loadImage } from 'canvas';
import TSqlite from '../sql/tsqlite'
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import Path from 'path';
import Twitter from 'twitter-lite';

const setting = config.picfinder.newsetu;
const replys = config.picfinder.replys;
const newsetuReg = new NamedRegExp(config.picfinder.regs.newsetu);
const sqlPath = Path.resolve(__dirname, '../../data/tdb.sqlite');

var localStorage;

if (typeof localStorage === "undefined" || localStorage === null) {
  var LocalStorage = require('node-localstorage').LocalStorage;
  localStorage = new LocalStorage('./groupsubscription');
}

function rfc1738encode (str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
}

function getDateSec() {
    return Math.floor(Date.now() / 1000);
}

function processSetu(context, replyFunc, logger, bot) {
	// console.log(context);
	// console.log(context.user_id);
	const newSetuRegExec = newsetuReg.exec(context.message);
	const db = new TSqlite();
	const limit = {
            value: setting.limit,
            cd: setting.cd,
        };
    let delTime = setting.deleteTime;

    const user = new Twitter({
		consumer_key: setting.twitter_consumer_key,
		consumer_secret: setting.twitter_consumer_secret
	});

	// console.log(newSetuRegExec);

	if (newSetuRegExec){
		const regGroup = newSetuRegExec.groups || {};
		const update = regGroup.update;
		const random = regGroup.random;
		const quality = regGroup.quality;
		const subscribe = regGroup.user;
		const groupsubscribe = regGroup.subscribe;
		const quantity = regGroup.quantity;

		// console.log(regGroup)
		console.log(update);
		console.log(random);
		console.log(quality);
		console.log(subscribe);
		console.log(groupsubscribe);

		var count = 1

		if (quantity){
			var count = Number(quantity.replace('x', ''));
			if (!Number.isInteger(count)){
				count = 1;
			}else{
				count = Number(count);
				if (count <= 0){
					count = 1;
				}
				if (count > 5){
					if (context.sender){
						if (setting.admin != context.sender.user_id){
							count = 5;
						}
					}else{
						if (setting.admin != context.user_id){
							count = 5;
						}
					}
					
				}
			}
		}
		console.log(count);

		if (context.group_id) {
            limit.cd = setting.whiteCd;
            delTime = setting.whiteDeleteTime;
        } else {
            limit.cd = 0; //私聊无cd
        }

        if (subscribe && context.user_id == setting.admin){
        	db.addUser(subscribe);
        	replyFunc(context, "已添加: " + subscribe, true);
        	// console.log(context);
        }

        var i = 0;

        if (update && context.user_id == setting.admin){

        	(async () => {

        		let security = await user.getBearerToken();
        		const app = new Twitter({
					bearer_token: security.access_token
				});

	            let sql = await open({
	                filename: sqlPath,
	                driver: sqlite3.Database,
	            });
	            let query = 'SELECT * from `subscribed`';
	            
	            sql.each(query, (err, row) => {
	                if (err){
	                    throw err;
	                }
	                console.log("Updating: " + row.uid);
	                const response = get_user_timeline(app, row.uid, setting.update_count)
	                	.then(function(results){
	                		//console.log(results);
	                		var db = new sqlite3.Database(sqlPath);
	                		db.serialize(function() {
		                		results.forEach(element => {
		                			if (element){
		                				if (element){
		                					if(element.retweeted_status && element.retweeted_status.favorite_count >= setting.minlikes){
		                						if (element.retweeted_status.entities.media){
		                							let imgurl = element.retweeted_status.entities.media[0].media_url;
		                							let tweeturl = element.retweeted_status.entities.media[0].url;
		                							let user = element.retweeted_status.user.name;
		                							let likes = element.retweeted_status.favorite_count;
		                							console.log(imgurl);
		                							console.log(tweeturl);
		                							console.log(user);
		                							console.log(likes);
		                							if (!imgurl.includes("ext_tw_video_thumb")){
		                								insert_w_callback(db, imgurl, tweeturl, user, likes, setting.max_tries);
		                							}
		                						}
		                					}else{
		                						if (element.entities.media && element.favorite_count >= setting.minlikes){
		                							let imgurl = element.entities.media[0].media_url;
		                							let tweeturl = element.entities.media[0].url;
		                							let user = element.user.name;
		                							let likes = element.favorite_count;
		                							console.log(imgurl);
		                							console.log(tweeturl);
		                							console.log(user);
		                							console.log(likes);
		                							if (!imgurl.includes("ext_tw_video_thumb")){
		                								insert_w_callback(db, imgurl, tweeturl, user, likes, setting.max_tries);
		                							}
		                						}
		                					}
		                				}
		                			}     			
		                		})		
	                		});
	                	})
	                	.catch(e => {
	                		console.error(e);
	                		console.log("from: " + row.uid);
	                	});
	            });
            	return true;
	        })().catch(e => {
	            console.error(`${new Date().toLocaleString()} [error] SQLite`);
	            console.error(e);
	        });
        }

        if (random) {
        	(async () => {
	        	let sql = await open({
					filename: sqlPath,
					driver: sqlite3.Database,
				});
				let query = `SELECT * FROM feed ORDER BY RANDOM() LIMIT ${count};`;
	        	sql.each(query, (err, row) => {
	        		if (err){
		                throw err;
		            }
		            console.log(row);
		            getBase64(row.imgurl)
		            .then(base64 => {
		            	// console.log(base64);
		            	replyFunc(context, CQcode.img64(base64));
		            })
		            .catch(e => {
		            	console.error(e);
		            });
		        });
        	})().catch(e => {
				console.error(e);
        	});
        }

        if (quality) {
        	(async () => {
	        	let sql = await open({
					filename: sqlPath,
					driver: sqlite3.Database,
				});
				let offset = getDateSec() - 86400;
				let query = `SELECT * FROM feed ORDER BY RANDOM() LIMIT 1 WHERE t > ${offset};`;
	        	sql.each(query, (err, row) => {
	        		if (err){
		                throw err;
		            }
		            console.log(row);
		            getBase64(row.imgurl)
		            .then(base64 => {
		            	// console.log(base64);
		            	replyFunc(context, CQcode.img64(base64));
		            })
		            .catch(e => {
		            	console.error(e);
		            });
		        });
        	})().catch(e => {
				console.error(e);
        	});
        }

        if (groupsubscribe && context.user_id == setting.admin) {
        	localStorage.setItem(context.group_id, count);
        	replyFunc(context,`已为本群订阅: ${count}/时`);
        	return 'restart';
        }
	}
	return false;
}

function insert_w_callback(db, imgurl, tweeturl, user, likes, tries){
	db.run('REPLACE INTO `feed` (`imgurl`, `tweeturl`, `username`, `likes`, `t`) VALUES (?, ?, ?, ?, ?)',
	[imgurl, tweeturl, user, likes, getDateSec()],
	function(e) {
		if (e){
			if (tries <= 0){
				console.log("Failed with max tries")
			}else{
				setTimeout(function (){
					console.log(`${tweeturl} tried: ${setting.max_tries - tries}`)
					insert_w_callback(db, imgurl, tweeturl, user, likes, tries - 1);
				}, Math.random() * 10000);
			}	
		}else{
			console.log(`${tweeturl} suceeded at ${setting.max_tries - tries}`)
		}
	});
}

function getBase64(url) {
  return Axios
    .get(url, {
      responseType: 'arraybuffer'
    })
    .then(response => Buffer.from(response.data, 'binary').toString('base64'))
}

async function get_user_timeline(app, uid, count) {
    const response = await app.get('statuses/user_timeline',{
	    screen_name: `${uid}`,
	    include_entities: true,
	    count: count
	});

    let promise = new Promise((resolve, reject) => {
        setTimeout(() => resolve("done!"), 10000)
    })

    let result = await promise;
    return response;
}

export default processSetu;