/**
 * ゆかレシピ用 Cloudflare Worker
 * Cloudflareのオンラインエディターに、このファイルの全文を貼り付けます。
 * 以下3つを Cloudflare > Settings > Variables and Secrets に登録してください。
 *  Secret: GEMINI_API_KEY = Google AI Studioで発行したAPIキー
 *  Secret: APP_PASSCODE = 自分で決めた8文字以上の合言葉
 *  Text  : ALLOWED_ORIGIN = https://satonowa311-coder.github.io (省略時もこの値)
 * 任意: GEMINI_MODEL = gemini-3.5-flash-lite (デフォルト)
 * ★ APIキーと合言葉をGitHubのファイルに直接書かないこと。
 * ★ Originチェックは一般のブラウザを制限するもの。公開APIの完全な不正利用防止ではありません。
 *    合言葉を第三者に公開せず、無料枠・利用状況を定期的に確認してください。
 */
const DEFAULT_ORIGIN = "https://satonowa311-coder.github.io";
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const MAX_BODY_SIZE = 2_800_000;

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-App-Code",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
}
function json(data,status,origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers:{"Content-Type":"application/json; charset=utf-8",...corsHeaders(origin)}
  });
}
function stringList(value, maxCount, maxLength=40) {
  if(!Array.isArray(value))return [];
  return value.slice(0,maxCount).filter(x=>typeof x==="string").map(x=>x.trim().slice(0,maxLength)).filter(Boolean);
}
function geminiText(reply) {
  const candidate=reply?.candidates?.[0];
  const text=candidate?.content?.parts?.filter(p=>typeof p.text==="string").map(p=>p.text).join("")||"";
  if(!text)throw new Error("EMPTY_RESPONSE");
  try{return JSON.parse(text);}catch{
    const start=text.indexOf("{"),end=text.lastIndexOf("}");
    if(start>=0&&end>start)return JSON.parse(text.slice(start,end+1));
    throw new Error("INVALID_JSON");
  }
}
async function askGemini(env,parts,maxTokens=3100) {
  const model=String(env.GEMINI_MODEL||DEFAULT_MODEL);
  if(!/^[a-zA-Z0-9._-]{3,80}$/.test(model))throw new Error("INVALID_MODEL");
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  let response;
  try {
    response=await fetch(url,{
      method:"POST",
      headers:{"Content-Type":"application/json","x-goog-api-key":env.GEMINI_API_KEY},
      body:JSON.stringify({contents:[{role:"user",parts}],generationConfig:{responseMimeType:"application/json",maxOutputTokens:maxTokens,temperature:0.25}}),
      signal:AbortSignal.timeout(35000),
    });
  }catch(error) {
    if(error?.name==="TimeoutError"||error?.name==="AbortError")throw new Error("AI_TIMEOUT");
    throw new Error("GOOGLE_UNREACHABLE");
  }
  if(!response.ok){
    if(response.status===429)throw new Error("RATE_LIMIT");
    if(response.status===401||response.status===403)throw new Error("BAD_API_KEY");
    if(response.status===404)throw new Error("MODEL_NOT_AVAILABLE");
    throw new Error("GEMINI_FAILED_"+response.status);
  }
  return geminiText(await response.json());
}

export default {
  async fetch(request,env) {
    const allowedOrigin=String(env.ALLOWED_ORIGIN||DEFAULT_ORIGIN).replace(/\/$/,"");
    const origin=request.headers.get("Origin")||"";
    if(origin!==allowedOrigin)return new Response("Forbidden origin",{status:403});
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders(origin)});
    if(request.method!=="POST")return json({ok:false,error:"POSTで送信してください。"},405,origin);
    if(!env.GEMINI_API_KEY||!env.APP_PASSCODE||String(env.APP_PASSCODE).length<8) {
      return json({ok:false,error:"CloudflareでGEMINI_API_KEYと8文字以上のAPP_PASSCODEを設定してください。"},503,origin);
    }
    if(request.headers.get("X-App-Code")!==String(env.APP_PASSCODE)) {
      return json({ok:false,error:"合言葉が違います。AI設定を確認してね。"},401,origin);
    }
    const contentLength=Number(request.headers.get("Content-Length")||0);
    if(contentLength>MAX_BODY_SIZE)return json({ok:false,error:"画像が大きすぎます。別の写真で試してね。"},413,origin);
    try {
      const input=await request.text();
      if(input.length>MAX_BODY_SIZE)return json({ok:false,error:"データが大きすぎます。"},413,origin);
      let body;
      try{body=JSON.parse(input);}catch{return json({ok:false,error:"送信データが正しくありません。"},400,origin);}

      if(body.action==="analyze"){
        const image=body.image;
        if(typeof image!=="string"||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image)||image.length>2_300_000) {
          return json({ok:false,error:"JPEGの写真を選び直してね。"},400,origin);
        }
        const prompt="あなたは日本の家庭料理の食材判別アシスタントです。写真に実際に写っていて、見分けられる食品・食材の名前だけを日本語で最大15件答えてください。容器や調理器具は数えません。不明なものは推測で追加しないでください。写真に食品がなければ空配列にしてください。必ずJSONオブジェクト {\"ingredients\":[\"食材名\"]} のみを返してください。";
        const result=await askGemini(env,[{text:prompt},{inline_data:{mime_type:"image/jpeg",data:image.slice("data:image/jpeg;base64,".length)}}],850);
        return json({ok:true,ingredients:stringList(result.ingredients,15,30)},200,origin);
      }

      if(body.action==="recipes"){
        const ingredients=stringList(body.ingredients,35,30);
        const avoid=stringList(body.avoid,10,30);
        const servings=Math.max(1,Math.min(10,Math.floor(Number(body.servings)||2)));
        const maxTime=[15,30,45,60].includes(Number(body.maxTime))?Number(body.maxTime):30;
        if(!ingredients.length)return json({ok:false,error:"まず食材を入力してね。"},400,origin);
        const prompt=[
          "あなたは日本の家庭料理のレシピ提案アシスタントです。", "以下の条件で実用的で違いのある料理を最大3品考えてください。",
          "手元にある食材: "+JSON.stringify(ingredients),
          "人数: "+servings+"人分", "調理時間の上限: "+maxTime+"分", "使いたくない食材・条件: "+JSON.stringify(avoid),
          "優先条件: 手元の食材をできるだけ使い、足りない材料は少なくする。足りない材料を勝手に『ある』と仮定しない。",
          "買い足しには一般的なコンビニで探しやすい食材を優先するが、セブン‐イレブンの在庫・価格・取扱いは確認できないので断言しない。",
          "避けたい食材が入力された場合は使わない。加熱が必要な肉・卵は安全に火を通す。現実的な手順にする。",
          "調味料も使用するなら材料に含める。各レシピのingredientsに必要な食材・調味料をnameとamountで列挙する。",
          "必ず次のJSONオブジェクトのみを返す。説明やコードブロックは不要:",
          '{"recipes":[{"title":"料理名","description":"短い紹介","time":20,"ingredients":[{"name":"卵","amount":"2個"}],"steps":["手順1","手順2"]}]}',
          "各料理はstepsが2〜6項目、ingredientsが2〜15項目、timeは数値で指定。"
        ].join("\n");
        const result=await askGemini(env,[{text:prompt}],3400);
        if(!Array.isArray(result.recipes))throw new Error("INVALID_RECIPES");
        return json({ok:true,recipes:result.recipes.slice(0,3)},200,origin);
      }
      return json({ok:false,error:"未対応の操作です。"},400,origin);
    }catch(error){
      const message=({
        RATE_LIMIT:"Geminiの利用上限に達しました。しばらく待ってから試してね。",
        BAD_API_KEY:"Gemini APIキーの設定を確認してね。",
        MODEL_NOT_AVAILABLE:"このGeminiモデルを利用できません。GEMINI_MODELを変更するか、Google AI Studioでモデルを確認してね。",
        AI_TIMEOUT:"AIの応答が遅れています。少し待って再試行してね。",
        GOOGLE_UNREACHABLE:"Geminiに接続できませんでした。",
        EMPTY_RESPONSE:"AIから回答がありませんでした。もう一度試してね。",
        INVALID_JSON:"AIの回答を読み取れませんでした。もう一度試してね。",
        INVALID_RECIPES:"AIからレシピを取得できませんでした。もう一度試してね。",
        INVALID_MODEL:"AIモデルの設定が正しくありません。"
      })[error.message]||"AIの処理でエラーが発生しました。";
      return json({ok:false,error:message},error.message==="RATE_LIMIT"?429:502,origin);
    }
  }
};
