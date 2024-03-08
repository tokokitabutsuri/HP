import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient("https://ojizjelrnhsxpmjtavhi.supabase.co/", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qaXpqZWxybmhzeHBtanRhdmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTkyMzUwNjcsImV4cCI6MjAxNDgxMTA2N30.7ElMMPF5I89Ec3-nwnLczykjM96ZxMubfwgMLF4LJ1k");

const params = new URL(document.location).searchParams;

const reload = async () => {
	const threadID = params.get("thread");
	const mode = params.get('mode') ?? 'all';
	const loadtitle = supabase
		.from('threads')
		.select()
		.eq('id', threadID)
		.then((data) => {
			document.getElementById('title').innerText = data.data[0].title;
			document.title = `${data.data[0].title} -物理部掲示板	`;
			document.querySelector('meta[name="description"]').content = data.data[0].title;
		});
	let loadcomments;
	if (mode === 'all') {
		loadcomments = supabase
			.from("comments")
			.select()
			.eq("thread_id", threadID)
			.order('posted_at', { ascending: true })
			.then((data) => { makeview(data.data); });
	} else if (mode === 'latest') {
		loadcomments = supabase
			.from("comments")
			.select()
			.eq("thread_id", threadID)
			.order('posted_at', { ascending: false })
			.limit(20)
			.then((data) => { makeview(data.data.reverse()); });
	}
	await Promise.all([loadtitle, loadcomments]);
};
/**
 * @param {string} message 
 */
const replacemessage = (message, isembed = false) => {
	let m = "";
	m = message.replace(
		/[&'"]/g,
		(m) =>
			({
				"&": "&amp;",
				"'": "&apos;",
				'"': "&quot;",
			})[m],
	);
	if (isembed) {
		return m.replace(
			/[<>]/g,
			(m) =>
				({
					"<": "&lt;",
					">": "&gt;"
				})[m],
		);
	}
	m = m.replaceAll("<", "&lt;");
	m = m.replaceAll(/>>([0-9]+)/g, "<$1");
	m = m.replaceAll(">", "&gt;");
	m = m.replaceAll(/<([0-9]+)/g, '<a href="#" onclick="popup($1);return false;">&gt;&gt;$1</a>');
	return m;
};
/**
 * @param {{num:Number,username:string,postdate:string|Date,id:string,replacedcomment:string}}
 */
const commentelem = ({ num, username, postdate, id, replacedcomment }) => `<div class="menubutton" onclick="openmenu(this,arguments[0])"><img src="menu.svg" width="16px" height="16px"
alt="menu">
<div class="bbsmenu">
<button type="button" onclick="copyuuid(this,arguments[0])">グローバルIDをコピー</button>
<button type="button" onclick="this.parentNode.parentNode.parentNode.remove()">非表示にする</button>
</div>
</div>
				<span class="num">${num}.</span>
				<span class="username">${username}</span><wbr>
				<span style="white-space:nowrap;">
				<span class="postdate">${new Date(postdate).toLocaleString('ja-jp')}</span>
				<span class="id">ID:${id}</span>
				</span>
				<pre class="comment">${replacedcomment}</pre>`;
const makeview = (data) => {
	document.getElementById('view').innerHTML = '';
	for (const i in data) {
		data[i];
		const elem = document.createElement("div");
		elem.id = i;
		elem.dataset.uuid = data[i].comment_id;
		elem.innerHTML = commentelem({ num: Number.parseInt(i) + 1, username: data[i].poster_name, postdate: data[i].posted_at, id: data[i].poster_id, replacedcomment: replacemessage(data[i].comment) });
		document.getElementById("view").appendChild(elem);
	}
};

const post = () => {
	const data = {
		poster_name: document.getElementById("name").value,
		comment: document.getElementById("message").value,
		thread_id: params.get("thread")
	};
	fetch('/api/bbs_post', {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data)
	})
		.then(async (rawdata) => {
			if (rawdata.ok) {
				return rawdata.json();
			}
			throw new Error((await rawdata.json()).message);
		})
		.then((data) => {
			console.log(data);
			document.getElementById("message").value = '';
			setTimeout(reload, 500);
		})
		.catch((e) => {
			window.alert(e);
		});
};

//onclickで使う関数たち
window.copyuuid = (elem, event) => {
	console.log(elem.parentNode.parentNode.parentNode.classList);
	navigator.clipboard.writeText(elem.parentNode.parentNode.parentNode.dataset.uuid);
	elem.parentNode.parentNode.parentNode.classList.remove("menuon");
	event.stopPropagation();
};
window.openmenu = (elem, event) => {
	const menu = Array.from(document.getElementsByClassName("menuon"));
	for (const i in menu) {
		menu[i].classList.remove("menuon");
	}
	elem.parentElement.classList.toggle("menuon");
	event.stopPropagation();
};
window.popup = async (anchor) => {
	const popup = document.getElementById('popup');
	document.getElementById('overray').style = '';
	let iserror = false;
	const data = await supabase
		.from("comments")
		.select()
		.eq("thread_id", params.get('thread'))
		.order('posted_at', { ascending: true })
		.range(anchor - 1, anchor - 1)
		.then((data) => { console.log(data); if (!data.data[0]) { iserror = true; }; return data.data[0]; })
		.catch(() => { iserror = true; });
	if (iserror) {
		popup.innerText = 'エラー：コメントが存在しない可能性があります。';
		return;
	}
	const elem = document.createElement("div");
	elem.id = anchor;
	elem.dataset.uuid = data.comment_id;
	elem.innerHTML = commentelem({ num: anchor, username: data.poster_name, postdate: data.posted_at, id: data.poster_id, replacedcomment: replacemessage(data.comment, false) });
	popup.innerHTML = '';
	popup.appendChild(elem);
};

//イベントリスナーズ
document.getElementById('reload').addEventListener('click', reload);
document.getElementById('post').addEventListener('click', post);
document.getElementById('overray').addEventListener('click', (ev) => { ev.target.style.display = 'none'; });
document.getElementById('popup').addEventListener('click', (ev) => { ev.stopPropagation(); });
window.addEventListener('DOMContentLoaded', async () => {
	await reload();
	document.body.style.display = '';
});
window.addEventListener("click", () => {
	const menu = Array.from(document.getElementsByClassName("menuon"));
	for (const i in menu) {
		menu[i].classList.remove("menuon");
	}
});