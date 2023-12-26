import { createClient } from '@supabase/supabase-js'
const { createHmac } = await import('node:crypto');
// Create a single supabase client for interacting with your database
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)


const getip: string = (request) => {
    if (request.headers['x-forwarded-for']) {
        return request.headers['x-forwarded-for'];
    }

    if (request.connection && request.connection.remoteAddress) {
        return request.connection.remoteAddress;
    }

    if (request.connection.socket && request.connection.socket.remoteAddress) {
        return request.connection.socket.remoteAddress;
    }

    if (request.socket && request.socket.remoteAddress) {
        return request.socket.remoteAddress;
    }
    return '0.0.0.0';
}

export default async (request, response) => {
    let fin: boolean = false;
    if (request.method !== 'POST') {
        fin = true;
        return response.status(400).json({ "status": "error" });
    }
    const myposter_id: string = createHmac('md5').update(getip(request), new Date().toDateString()).digest('hex').substr(0,8);
    const mycomment: string = request.body.comment;
    const mythread_id = request.body.thread_id;
    let myreply_token = '';
    if (request.body in reply_token) {
        myreply_token = request.body.reply_token;
    }
    await supabase
  .from('comments')
  .insert({ poster_id: myposter_id, comment: mycomment,thread_id:mythread_id,reply_token:myreply_token })
  .then((data)=>{
    if(data.status!=201){
        console.log(data.error);
        fin=true;
        return response.status(500).json({ "error": data.error });
    }
  })
    if (!fin) return response.status(200).json({ "status": "success" });
}