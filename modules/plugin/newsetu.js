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


function rfc1738encode (str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
}


function processSetu(context, replyFunc, logger, bot) {
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

	if (newSetuRegExec){
		const regGroup = newSetuRegExec.groups || {};
		const update = regGroup.update;
		const random = regGroup.random;
		const quality = regGroup.quality;
		const subscribe = regGroup.user;

		console.log(regGroup)
		console.log(update)
		console.log(random)
		console.log(quality)
		console.log(subscribe)

		if (context.group_id) {
                limit.cd = setting.whiteCd;
                delTime = setting.whiteDeleteTime;
        } else {
            limit.cd = 0; //私聊无cd
        }

        if (subscribe){
        	db.addUser(subscribe);
        }


        if (update){

        	(async () => {

        		let security = await user.getBearerToken();
        		const app = new Twitter({
					bearer_token: security.access_token
				});
				console.log(security.access_token)

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
	                const response = get_user_timeline(app, row.uid, 10)
	                	.then(function(results){
	                		//console.log(results);
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
	                							db.addTuple(imgurl, tweeturl, user, likes);
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
	                							db.addTuple(imgurl, tweeturl, user, likes);
	                						}
	                					}
	                				}
	                			}     			
	                		})
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
	}
	return false;
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