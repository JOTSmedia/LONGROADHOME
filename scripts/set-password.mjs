import {randomBytes,scryptSync} from 'node:crypto';
let password='';for await(const chunk of process.stdin)password+=chunk;
password=password.replace(/\r?\n$/,'');if(!password)throw Error('Supply password through stdin');
const salt=randomBytes(32).toString('hex');console.log(salt+':'+scryptSync(password,salt,64).toString('hex'));
