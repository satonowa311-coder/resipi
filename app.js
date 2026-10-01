"use strict";

// 公開サイトの利用者全員にAIを使わせる場合、Workerを公開したあと、
// ここに https://xxxxx.workers.dev のURLだけを書けます（合言葉やAPIキーは絶対に書かない）。
const DEFAULT_WORKER_URL = "";

const STORAGE = {
  ingredients: "karecipe-ingredients-v1",
  shopping: "karecipe-shopping-v1",
  preferences: "karecipe-preferences-v1",
  workerUrl: "karecipe-worker-url-v1",
  accessCode: "karecipe-session-code-v1",
};
const QUICK_INGREDIENTS = ["卵", "玉ねぎ", "にんじん", "キャベツ", "じゃがいも", "豚肉", "鶏肉", "ご飯", "豆腐", "ツナ缶"];
const NORMALIZE = [
  [/たまねぎ|タマネギ/g, "玉ねぎ"], [/にんじん|ニンジン/g, "人参"],
  [/玉子|たまご|タマゴ/g, "卵"], [/ジャガイモ|じゃが芋|ジャガ芋/g, "じゃがいも"],
  [/豚こま切れ肉|豚こま肉|豚バラ肉|豚ロース肉|豚こま|豚バラ/g, "豚肉"],
  [/鶏もも肉|鶏むね肉|鶏胸肉|鶏ささみ/g, "鶏肉"],
  [/しょうゆ|醬油|醤油/g, "しょうゆ"], [/葱|長ネギ|長ねぎ|青ねぎ/g, "ねぎ"],
  [/シーチキン/g, "ツナ缶"], [/白ご飯|ごはん|白米/g, "ご飯"],
  [/サラダオイル|サラダ油/g, "油"], [/牛乳|ミルク/g, "牛乳"]
];
const LOCAL_RECIPES = [
  {title:"ふわっと卵チャーハン",description:"冷蔵庫の定番食材で、ぱぱっと作る満足ごはん。",time:15,ingredients:[["ご飯","茶碗2杯"],["卵","2個"],["ねぎ","1/3本"],["しょうゆ","小さじ2"],["油","大さじ1"]],steps:["ねぎを刻み、卵を溶いておく。","フライパンで卵を半熟に炒め、ご飯とねぎを加える。","しょうゆで味を整え、全体を炒め合わせる。"]},
  {title:"野菜たっぷり豚肉炒め",description:"お肉と野菜を一緒に。ご飯が進む定番の一皿。",time:20,ingredients:[["豚肉","180g"],["キャベツ","1/4個"],["にんじん","1/2本"],["しょうゆ","大さじ1"],["油","小さじ2"]],steps:["肉と野菜を食べやすく切る。","油をひいたフライパンで豚肉を十分に加熱する。","野菜を加えて炒め、しょうゆで味を整える。"]},
  {title:"玉ねぎと卵のとろとろ丼",description:"少ない材料で作れて、忙しい日にも便利。",time:20,ingredients:[["ご飯","茶碗2杯"],["卵","2個"],["玉ねぎ","1/2個"],["しょうゆ","大さじ1"],["砂糖","小さじ1"]],steps:["玉ねぎを薄切りにして水少量と一緒に煮る。","しょうゆと砂糖で味を付け、溶き卵を加えて十分に火を通す。","温かいご飯にのせる。"]},
  {title:"じゃがいもと玉ねぎのみそ汁",description:"ほっとする味。あと一品ほしいときに。",time:20,ingredients:[["じゃがいも","1個"],["玉ねぎ","1/2個"],["みそ","大さじ1"],["だし","400ml"]],steps:["じゃがいもと玉ねぎを食べやすく切る。","だしで野菜が柔らかくなるまで煮る。","火を弱めてみそを溶く。"]},
  {title:"豆腐と卵のやさしいスープ",description:"体も温まる、食材を無駄にしないスープ。",time:15,ingredients:[["豆腐","1/2丁"],["卵","1個"],["ねぎ","1/3本"],["鶏ガラスープの素","小さじ1"],["水","400ml"]],steps:["鍋に水と鶏ガラスープの素を入れて温める。","切った豆腐とねぎを加えて煮る。","溶き卵を回し入れ、十分に火を通す。"]},
  {title:"ツナとキャベツの和風パスタ",description:"ストック食材が活躍する、手軽な一品。",time:25,ingredients:[["パスタ","200g"],["ツナ缶","1缶"],["キャベツ","1/4個"],["しょうゆ","小さじ2"],["油","小さじ1"]],steps:["パスタを表示時間に従ってゆでる。","キャベツを切ってツナと一緒に炒める。","パスタを加え、しょうゆで味を整える。"]},
  {title:"鶏肉とじゃがいもの甘辛煮",description:"具材に味がしみて、作り置きにも。",time:40,ingredients:[["鶏肉","200g"],["じゃがいも","2個"],["玉ねぎ","1/2個"],["しょうゆ","大さじ2"],["砂糖","大さじ1"],["水","200ml"]],steps:["鶏肉と野菜を一口大に切る。","鍋に材料を入れ、鶏肉の中心まで十分に火が通るまで煮る。","煮汁を軽く飛ばして味をなじませる。"]},
  {title:"にんじんと卵の彩り炒め",description:"色もきれいで、簡単な副菜にもおすすめ。",time:15,ingredients:[["にんじん","1本"],["卵","2個"],["油","小さじ2"],["塩","少々"]],steps:["にんじんを細切りにする。","フライパンでにんじんをしんなりするまで炒める。","溶き卵を加えて十分に加熱し、塩で味を整える。"]},
  {title:"キャベツと豆腐のふんわり焼き",description:"小麦粉を使ってまとめる、野菜たっぷりおかず。",time:25,ingredients:[["キャベツ","1/4個"],["豆腐","1/2丁"],["卵","1個"],["小麦粉","大さじ3"],["油","小さじ2"]],steps:["豆腐の水を切り、キャベツを細かく切る。","すべての材料を混ぜ、食べやすい大きさに形を整える。","フライパンで両面を焼き、中まで十分に火を通す。"]},
  {title:"ほくほくポテトオムレツ",description:"じゃがいも入りで食べごたえのある卵料理。",time:25,ingredients:[["じゃがいも","1個"],["卵","3個"],["玉ねぎ","1/2個"],["牛乳","大さじ2"],["油","小さじ2"]],steps:["じゃがいもを薄切りにし、加熱して柔らかくする。","玉ねぎを炒め、じゃがいもと溶き卵・牛乳を加える。","弱火でじっくり両面を焼き、中まで十分に火を通す。"]}
];

const $ = id => document.getElementById(id);
const ui = {
  photoInput:$("photoInput"), photoPreview:$("photoPreview"), photoPlaceholder:$("uploadPlaceholder"), photoHint:$("photoChangeHint"), photoHelp:$("photoHelp"),
  analyze:$("analyzeButton"), clearPhoto:$("clearPhoto"), ingredientInput:$("ingredientInput"), ingredientTags:$("ingredients"), quick:$("quickIngredients"),
  servings:$("servings"), maxTime:$("maxTime"), avoid:$("avoidInput"), recipes:$("recipeResults"), recipeNotice:$("recipeNotice"),
  shopping:$("shoppingList"), copyShopping:$("copyShopping"), clearShopping:$("clearShopping"), generate:$("generateButton"),
  dialog:$("settingsDialog"), workerUrl:$("workerUrl"), appCode:$("appCode"), settingsMessage:$("settingsMessage"), aiBadge:$("aiBadge"), toast:$("toast")
};
const readStored = (storage,key,fallback) => {try{const item=storage.getItem(key);return item===null?fallback:JSON.parse(item)}catch{return fallback}};
const writeStored = (storage,key,value) => {try{storage.setItem(key,JSON.stringify(value))}catch{/* 容量やプライベートモードで保存できない場合は画面内で利用 */}};
const cleanText = text => String(text??"").trim().slice(0,100);
function normalize(text){let result=cleanText(text).toLowerCase().replace(/[\s　（）()]/g,"");for(const [pattern,to] of NORMALIZE){result=result.replace(pattern,to)}return result;}
function isSame(a,b){const x=normalize(a),y=normalize(b);return x===y || (x.length>=2&&y.length>=2&&(x.includes(y)||y.includes(x)));}
function escapeHTML(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);}
function splitWords(text){return String(text).split(/[,，、\n\t]+/).map(x=>x.trim()).filter(Boolean).slice(0,30);}
let ingredients=readStored(localStorage,STORAGE.ingredients,[]);
if(!Array.isArray(ingredients))ingredients=[];
ingredients=ingredients.filter(x=>typeof x==="string").map(x=>x.slice(0,30)).slice(0,35);
let shopping=readStored(localStorage,STORAGE.shopping,[]);
if(!Array.isArray(shopping))shopping=[];
shopping=shopping.filter(x=>x&&typeof x.name==="string").slice(0,40);
const prefs=readStored(localStorage,STORAGE.preferences,{servings:"2",maxTime:"30",avoid:""});
ui.servings.value=String(prefs.servings||"2");ui.maxTime.value=String(prefs.maxTime||"30");ui.avoid.value=String(prefs.avoid||"");
let workerUrl=readStored(localStorage,STORAGE.workerUrl,DEFAULT_WORKER_URL)||DEFAULT_WORKER_URL;
let appCode="";try{appCode=sessionStorage.getItem(STORAGE.accessCode)||""}catch{}
let photoData="",busy=false,toastTimeout;

function toast(message){clearTimeout(toastTimeout);ui.toast.textContent=message;ui.toast.classList.add("show");toastTimeout=setTimeout(()=>ui.toast.classList.remove("show"),3500);}
function notice(message,isError=false){ui.recipeNotice.textContent=message;ui.recipeNotice.classList.toggle("error",isError);}
function isConfigured(){return Boolean(workerUrl&&appCode);}
function updateBadge(){const connected=isConfigured();ui.aiBadge.classList.toggle("connected",connected);ui.aiBadge.innerHTML=`<span class="status-dot"></span> ${connected?"AI接続設定済み":"手入力モード"}`;ui.photoHelp.textContent=connected?"写真を選んで「AIで食材を判別」を押してね。":"AIを使うには右上の「AI設定」から接続してください。手入力はすぐに使えます。";}
function addIngredients(values){let added=0;for(const input of values){const name=cleanText(input).slice(0,30);if(name&&!ingredients.some(x=>isSame(x,name))&&ingredients.length<35){ingredients.push(name);added++;}}writeStored(localStorage,STORAGE.ingredients,ingredients);renderIngredients();return added;}
function renderIngredients(){ui.ingredientTags.replaceChildren();if(!ingredients.length){const p=document.createElement("p");p.className="empty-inline";p.textContent="まだ食材がありません。写真か手入力で追加してね。";ui.ingredientTags.append(p);}else{ingredients.forEach((item,i)=>{const chip=document.createElement("span");chip.className="ingredient-chip";chip.append(document.createTextNode(item));const remove=document.createElement("button");remove.type="button";remove.setAttribute("aria-label",item+"を削除");remove.textContent="×";remove.addEventListener("click",()=>{ingredients.splice(i,1);writeStored(localStorage,STORAGE.ingredients,ingredients);renderIngredients();});chip.append(remove);ui.ingredientTags.append(chip);});}}
function renderQuick(){ui.quick.replaceChildren();for(const item of QUICK_INGREDIENTS){const btn=document.createElement("button");btn.type="button";btn.textContent="＋ "+item;btn.addEventListener("click",()=>{if(addIngredients([item]))toast(item+"を追加したよ");});ui.quick.append(btn);}}
function renderShopping(){ui.shopping.replaceChildren();if(!shopping.length){const p=document.createElement("p");p.className="empty-inline";p.textContent="まだ買い物メモはありません。";ui.shopping.append(p);}else{shopping.forEach((item,i)=>{const label=document.createElement("label");label.className="shopping-row"+(item.checked?" checked":"");const cb=document.createElement("input");cb.type="checkbox";cb.checked=Boolean(item.checked);cb.addEventListener("change",()=>{shopping[i].checked=cb.checked;writeStored(localStorage,STORAGE.shopping,shopping);renderShopping()});const name=document.createElement("span");name.textContent=item.name;const del=document.createElement("button");del.type="button";del.setAttribute("aria-label",item.name+"を買い物メモから削除");del.textContent="×";del.addEventListener("click",()=>{shopping.splice(i,1);writeStored(localStorage,STORAGE.shopping,shopping);renderShopping()});label.append(cb,name,del);ui.shopping.append(label);});}ui.copyShopping.disabled=!shopping.length;ui.clearShopping.disabled=!shopping.length;}
function addShopping(items){let count=0;for(const item of items){const name=cleanText(typeof item==="string"?item:item.name).slice(0,40);if(!name||shopping.some(x=>isSame(x.name,name))||shopping.length>=40)continue;shopping.push({name,checked:false});count++;}writeStored(localStorage,STORAGE.shopping,shopping);renderShopping();toast(count?count+"件、買い物メモに追加したよ":"すでに買い物メモに入っているよ");}
function matchesAvoid(recipe,avoids){return avoids.some(avoid=>recipe.ingredients.some(x=>isSame(x.name,avoid))||normalize(recipe.title).includes(normalize(avoid)));}
function have(name){return ingredients.some(x=>isSame(x,name));}
function formatQuantity(amount,servings){if(servings===2)return amount;return String(amount).replace(/\d+(?:\.\d+)?(?:\/\d+)?/,num=>{const value=num.includes("/")?Number(num.split("/")[0])/Number(num.split("/")[1]):Number(num);return String(Number((value*servings/2).toFixed(2)));});}
function localResults(){const maxTime=Number(ui.maxTime.value),servings=Number(ui.servings.value);const avoids=splitWords(ui.avoid.value);return LOCAL_RECIPES.filter(r=>r.time<=maxTime).map(r=>({...r,servings,source:"手元のレシピ",ingredients:r.ingredients.map(([name,amount])=>({name,amount:formatQuantity(amount,servings)})),steps:r.steps})).filter(r=>!matchesAvoid(r,avoids)).map(r=>({...r,score:r.ingredients.filter(x=>have(x.name)).length})).sort((a,b)=>b.score-a.score||a.time-b.time).slice(0,3);}
function normalizeAIRecipes(raw){if(!Array.isArray(raw))return[];return raw.slice(0,3).map(r=>({
 title:cleanText(r.title),description:cleanText(r.description).slice(0,140),time:Math.max(1,Math.min(180,Number(r.time)||30)),servings:Number(ui.servings.value),source:"AIの提案",
 ingredients:Array.isArray(r.ingredients)?r.ingredients.slice(0,22).map(x=>({name:cleanText(typeof x==="string"?x:x.name).slice(0,40),amount:cleanText(typeof x==="string"?"適量":x.amount).slice(0,30)})).filter(x=>x.name):[],
 steps:Array.isArray(r.steps)?r.steps.slice(0,10).map(x=>cleanText(x).slice(0,180)).filter(Boolean):[]
 })).filter(r=>r.title&&r.ingredients.length&&r.steps.length);}
function renderRecipes(recipes){ui.recipes.replaceChildren();if(!recipes.length){ui.recipes.innerHTML='<div class="welcome-card"><span>🥗</span><strong>条件に合うレシピが見つかりませんでした。</strong><p>食材や調理時間を変えて試してね。</p></div>';return;}
 recipes.forEach(recipe=>{const missing=recipe.ingredients.filter(x=>!have(x.name));const card=document.createElement("article");card.className="recipe-card";card.innerHTML=`<div class="recipe-card-header"><div class="recipe-topline"><span class="recipe-source">${escapeHTML(recipe.source)}</span><span class="recipe-time">⏱ ${escapeHTML(recipe.time)}分目安 ・ ${escapeHTML(recipe.servings)}人分</span></div><h3>${escapeHTML(recipe.title)}</h3><p class="recipe-description">${escapeHTML(recipe.description)}</p><div class="recipe-ingredient-row">${recipe.ingredients.map(item=>`<span class="${have(item.name)?"recipe-have":"recipe-need"}">${have(item.name)?"✓ ":"＋ "}${escapeHTML(item.name)} <small>${escapeHTML(item.amount)}</small></span>`).join("")}</div></div><details class="recipe-steps"><summary>🍴 作り方を見る</summary><ol>${recipe.steps.map(step=>`<li>${escapeHTML(step)}</li>`).join("")}</ol></details><div class="recipe-footer"><small>${missing.length?`足りない食材：${missing.length}件`:"材料はすべてそろっています ✓"}</small><button type="button" class="button button-secondary" ${missing.length?"":"disabled"}>🛒 ${missing.length?"買い物メモに追加":"買い足し不要"}</button></div>`;
 card.querySelector(".recipe-footer button").addEventListener("click",()=>addShopping(missing));ui.recipes.append(card);});}
function savePrefs(){writeStored(localStorage,STORAGE.preferences,{servings:ui.servings.value,maxTime:ui.maxTime.value,avoid:ui.avoid.value});}
async function callWorker(payload){if(!isConfigured())throw new Error("右上の「AI設定」でWorkerのURLと合言葉を設定してね。");let response;try{response=await fetch(workerUrl,{method:"POST",headers:{"Content-Type":"application/json","X-App-Code":appCode},body:JSON.stringify(payload),signal:AbortSignal.timeout(45000)});}catch(err){if(err?.name==="TimeoutError")throw new Error("AIの応答が45秒以内に返りませんでした。少し待って再試行してね。");throw new Error("AIに接続できません。WorkerのURLや公開設定を確認してね。");}let data;try{data=await response.json()}catch{throw new Error("AIの応答を読み取れませんでした。Cloudflareの設定を確認してね。");}if(!response.ok||!data.ok)throw new Error(cleanText(data.error)||"AIの処理に失敗しました。");return data;}
function setBusy(value,button){busy=value;ui.analyze.disabled=value||!photoData;ui.generate.disabled=value;button.textContent=value?"⏳ AIが考え中…":button===ui.analyze?"✨ AIで食材を判別":"🍳 この食材でレシピを探す";}
function preparePhoto(file){if(!file)return;if(!file.type.startsWith("image/")){toast("画像ファイルを選んでね");return;}if(file.size>12*1024*1024){toast("画像は12MB以下のものを選んでね");return;}const url=URL.createObjectURL(file);const photo=new Image();photo.onload=()=>{try{const limit=1280,scale=Math.min(1,limit/Math.max(photo.width,photo.height));const canvas=document.createElement("canvas");canvas.width=Math.round(photo.width*scale);canvas.height=Math.round(photo.height*scale);const ctx=canvas.getContext("2d");ctx.drawImage(photo,0,0,canvas.width,canvas.height);photoData=canvas.toDataURL("image/jpeg",.76);ui.photoPreview.src=photoData;ui.photoPreview.hidden=false;ui.photoPlaceholder.hidden=true;ui.photoHint.hidden=false;ui.clearPhoto.hidden=false;ui.analyze.disabled=false;toast("写真を選んだよ");}catch{toast("画像の読み込みに失敗しました");}finally{URL.revokeObjectURL(url);}};photo.onerror=()=>{URL.revokeObjectURL(url);toast("この画像は読み込めませんでした");};photo.src=url;}

ui.photoInput.addEventListener("change",e=>preparePhoto(e.target.files?.[0]));
$("dropArea").addEventListener("dragover",e=>{e.preventDefault();e.currentTarget.style.borderColor="#358054"});
$("dropArea").addEventListener("dragleave",e=>{e.currentTarget.style.borderColor=""});
$("dropArea").addEventListener("drop",e=>{e.preventDefault();e.currentTarget.style.borderColor="";preparePhoto(e.dataTransfer.files?.[0]);});
ui.clearPhoto.addEventListener("click",()=>{photoData="";ui.photoInput.value="";ui.photoPreview.removeAttribute("src");ui.photoPreview.hidden=true;ui.photoHint.hidden=true;ui.photoPlaceholder.hidden=false;ui.clearPhoto.hidden=true;ui.analyze.disabled=true;});
$("addIngredient").addEventListener("click",()=>{const n=addIngredients(splitWords(ui.ingredientInput.value));ui.ingredientInput.value="";ui.ingredientInput.focus();if(n)toast(n+"件の食材を追加したよ");});
ui.ingredientInput.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();$("addIngredient").click();}});
[ui.servings,ui.maxTime,ui.avoid].forEach(el=>el.addEventListener(el===ui.avoid?"change":"change",savePrefs));
ui.analyze.addEventListener("click",async()=>{if(busy||!photoData)return;if(!isConfigured()){$("openSettings").click();toast("AI設定をすると写真を判別できるよ");return;}setBusy(true,ui.analyze);try{const result=await callWorker({action:"analyze",image:photoData});const found=Array.isArray(result.ingredients)?result.ingredients.map(x=>cleanText(x).slice(0,30)).filter(Boolean):[];const count=addIngredients(found);toast(found.length?`AIが${found.length}件を見つけたよ。${count}件追加しました。`:"判別できなかったので、手入力してね");}catch(err){toast(err.message);}finally{setBusy(false,ui.analyze);}});
ui.generate.addEventListener("click",async()=>{if(busy)return;savePrefs();if(!ingredients.length){notice("先に食材を1つ以上追加してね。",true);toast("食材を追加してね");return;}if(!isConfigured()){const found=localResults();renderRecipes(found);notice("AI未接続のため、内蔵の定番レシピから提案しています。写真判定とAI提案は右上の「AI設定」から。",false);return;}setBusy(true,ui.generate);notice("AIが食材・人数・調理時間に合わせてレシピを考えています…");try{const data=await callWorker({action:"recipes",ingredients,servings:Number(ui.servings.value),maxTime:Number(ui.maxTime.value),avoid:splitWords(ui.avoid.value)});const recipes=normalizeAIRecipes(data.recipes);if(!recipes.length)throw new Error("レシピの形式を読み取れませんでした。");renderRecipes(recipes);notice("AIの提案です。分量や加熱時間は目安です。食材・調味料の表示と火の通りを確認してね。");}catch(err){renderRecipes(localResults());notice("AIに接続できなかったため、内蔵レシピを表示しています。"+err.message,true);}finally{setBusy(false,ui.generate);}});
ui.copyShopping.addEventListener("click",async()=>{const text=shopping.map(x=>(x.checked?"☑ ":"□ ")+x.name).join("\n")+"\n※店舗の在庫・価格は未確認";try{await navigator.clipboard.writeText(text);toast("買い物メモをコピーしたよ");}catch{toast("コピーできませんでした。ブラウザの権限を確認してね。");}});
ui.clearShopping.addEventListener("click",()=>{if(!shopping.length)return;if(!confirm("買い物メモをすべて消しますか？"))return;shopping=[];writeStored(localStorage,STORAGE.shopping,shopping);renderShopping();});
$("openSettings").addEventListener("click",()=>{ui.workerUrl.value=workerUrl;ui.appCode.value=appCode;ui.settingsMessage.textContent="";ui.dialog.showModal();});
$("closeSettings").addEventListener("click",()=>ui.dialog.close());
ui.dialog.addEventListener("click",e=>{if(e.target===ui.dialog)ui.dialog.close();});
$("saveSettings").addEventListener("click",()=>{const url=ui.workerUrl.value.trim().replace(/\/$/,"");const code=ui.appCode.value.trim();if(url&&!/^https:\/\/[^\s]+$/i.test(url)){ui.settingsMessage.textContent="https://から始まるWorkerのURLを入力してね。";return;}workerUrl=url;appCode=code;writeStored(localStorage,STORAGE.workerUrl,workerUrl);try{if(appCode)sessionStorage.setItem(STORAGE.accessCode,appCode);else sessionStorage.removeItem(STORAGE.accessCode);}catch{}updateBadge();ui.dialog.close();toast(isConfigured()?"AIの接続設定を保存したよ":"手入力モードで利用できます");});
$("removeSettings").addEventListener("click",()=>{workerUrl="";appCode="";ui.workerUrl.value="";ui.appCode.value="";writeStored(localStorage,STORAGE.workerUrl,"");try{sessionStorage.removeItem(STORAGE.accessCode)}catch{}updateBadge();ui.dialog.close();toast("AIの接続設定を解除したよ");});
renderIngredients();renderQuick();renderShopping();updateBadge();
