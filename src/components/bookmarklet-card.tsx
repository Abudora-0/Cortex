"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, RefreshCw, Check, Copy } from "lucide-react";
import { ensureSyncToken, regenerateSyncToken } from "@/lib/actions";
import { Button } from "@/components/ui/button";

/**
 * Builds the self-contained bookmarklet. It runs on the LMS page (same-origin,
 * so the session cookie is sent), pulls results + profile via Odoo JSON-RPC,
 * and POSTs the snapshot to this app's /api/lms/ingest with the user's token.
 */
function buildBookmarklet(appUrl: string, token: string): string {
  // Kept on one line; APP and TOKEN are injected. Uses only vanilla JS so it
  // works inside the LMS page regardless of framework.
  const code = `(async function(){var APP=${JSON.stringify(appUrl)},TKN=${JSON.stringify(
    token
  )},B=location.origin;function rpc(m,f,a,k){return fetch(B+"/web/dataset/call_kw",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",method:"call",params:{model:m,method:f,args:a,kwargs:k||{}}})}).then(function(r){return r.json()}).then(function(j){if(j.error)throw new Error((j.error.data&&j.error.data.message)||j.error.message||"RPC error");return j.result})}try{var info=await fetch(B+"/web/session/get_session_info",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",method:"call",params:{}})}).then(function(r){return r.json()});var uid=info.result&&info.result.uid;if(!uid){alert("Open and log into the UET LMS first, then click this again.");return}var users=await rpc("res.users","search_read",[[["id","=",uid]],["name","student_id"]],{limit:1});var sref=users[0]&&users[0].student_id;if(!sref){alert("No student is linked to this LMS account.");return}var studentId=sref[0],roll=sref[1];var program=null,department=null,semesterSeq=null;try{var stu=await rpc("obe.core.student","read",[[studentId],["roll_no","session_id","department_program_id","semester_sequence"]]);var row=stu[0]||{};program=row.session_id?row.session_id[1]:null;semesterSeq=typeof row.semester_sequence==="number"?row.semester_sequence:null;var dep=row.department_program_id;department=dep&&!/,\\d+$/.test(dep[1])?dep[1]:null}catch(e){}var rows=await rpc("obe.core.result","search_read",[[["student_id","=",studentId]],["id","subject_id","subject_name_for_grade_book","semester_name","rel_grade","grade","gp_rel","ch_rel","weightage","result_uo_status_rel"]],{limit:200});function num(v){var n=typeof v==="number"?v:parseFloat(v);return isFinite(n)?n:null}function str(v){return typeof v==="string"?v:(v==null||v===false?null:String(v))}function sc(nm){var m=nm.match(/^([A-Z]{2,5}-\\d+[A-Z]?)\\s+(.*)$/);return m?{code:m[1],title:m[2]}:{code:null,title:nm}}var sids=[];for(var si=0;si<rows.length;si++){var sd=Array.isArray(rows[si].subject_id)?rows[si].subject_id[0]:null;if(sd!=null&&sids.indexOf(sd)<0)sids.push(sd)}var meta={};for(var mi=0;mi<sids.length;mi++)meta[sids[mi]]={teacher:null,outline:null};var h2t=function(x){return String(x).replace(/<\\s*(br|\\/p|\\/li|\\/div|\\/tr)\\s*\\/?>/gi,"\\n").replace(/<[^>]+>/g,"").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").split("\\n").map(function(l){return l.trim()}).filter(Boolean).join("\\n").slice(0,6000)};var wkn=function(v){var n=parseInt(v,10);return isFinite(n)?n:9999};try{if(sids.length){var rel=await rpc("obe.core.result","fields_get",[["subject_id"]],{attributes:["relation"]});var smodel=rel&&rel.subject_id&&rel.subject_id.relation;if(smodel){var sf=await rpc(smodel,"fields_get",[[]],{attributes:["type","relation"]});var tfld=null,cfld=null,dfld=null,fk;for(fk in sf){var ty=sf[fk]&&sf[fk].type;if(!tfld&&ty==="many2one"&&/teacher|faculty|instructor|incharge/i.test(fk))tfld=fk;if(!cfld&&ty==="one2many"&&/content/i.test(fk))cfld=fk;if(!dfld&&(ty==="text"||ty==="html"||ty==="char")&&/course_description|description|outline|syllabus/i.test(fk))dfld=fk}try{if(tfld){var subsT=await rpc(smodel,"read",[sids,["id",tfld]]);for(var t1=0;t1<subsT.length;t1++){var ts=subsT[t1];var tv=ts[tfld];var mt=Array.isArray(tv)?str(tv[1]):str(tv);if(mt&&meta[ts.id])meta[ts.id].teacher=mt}}}catch(e){}try{var rf=["id"];if(cfld)rf.push(cfld);if(dfld)rf.push(dfld);if(rf.length>1){var subs=await rpc(smodel,"read",[sids,rf]);var tbs={};if(cfld){var cmodel=sf[cfld]&&sf[cfld].relation;var cids=[];for(var c1=0;c1<subs.length;c1++){var cv=subs[c1][cfld];if(Array.isArray(cv))for(var c2=0;c2<cv.length;c2++)cids.push(cv[c2])}if(cmodel&&cids.length){var recs=await rpc(cmodel,"read",[cids.slice(0,800),["id","week","topics","subject_id"]]);for(var r1=0;r1<recs.length;r1++){var rc=recs[r1];var sid2=Array.isArray(rc.subject_id)?rc.subject_id[0]:null;if(sid2==null)continue;if(!tbs[sid2])tbs[sid2]=[];tbs[sid2].push(rc)}}}for(var s1=0;s1<subs.length;s1++){var so=subs[s1];var ol=null;var list=tbs[so.id];if(list&&list.length){list.sort(function(a,b){return wkn(a.week)-wkn(b.week)||a.id-b.id});var lines=[];for(var l1=0;l1<list.length;l1++){var tp=str(list[l1].topics);if(tp){tp=tp.replace(/\\s+/g," ").trim();if(tp)lines.push(tp)}}if(lines.length)ol=lines.join("\\n").slice(0,6000)}if(!ol&&dfld){var dv=so[dfld];if(typeof dv==="string"&&dv.trim())ol=h2t(dv)}if(ol&&meta[so.id])meta[so.id].outline=ol}}}catch(e){}}}}catch(e){}var results=rows.map(function(r,i){var raw=str(r.subject_name_for_grade_book)||(Array.isArray(r.subject_id)?String(r.subject_id[1]):"Course");var cd=sc(raw);var ch=num(r.ch_rel)||0;var qp=num(r.gp_rel);var gp=qp!=null&&ch>0?Math.round(qp/ch*100)/100:null;var sm=meta[Array.isArray(r.subject_id)?r.subject_id[0]:-1]||{};return{lmsCourseId:String(r.id),semesterName:str(r.semester_name)||"Unknown semester",code:cd.code,title:cd.title,creditHours:ch,percent:num(r.weightage),grade:str(r.rel_grade)||str(r.grade),gradePoints:gp,status:str(r.result_uo_status_rel),order:i,teacher:sm.teacher||null,outline:sm.outline||null}});var snapshot={studentId:studentId,roll:roll,name:users[0].name||roll,program:program,profile:{roll:roll,program:program,department:department,semesterSeq:semesterSeq},results:results};var res=await fetch(APP+"/api/lms/ingest",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:TKN,snapshot:snapshot})});var out=await res.json();alert(out.ok?("Cortex: "+out.message):("Cortex sync failed: "+(out.error||res.status)))}catch(e){alert("Cortex sync error: "+((e&&e.message)||e))}})();`;
  return "javascript:" + encodeURIComponent(code);
}

export function BookmarkletCard() {
  const [token, setToken] = useState<string | null>(null);
  const [appUrl, setAppUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);

  const copyBookmarklet = async () => {
    if (!token || !appUrl) return;
    try {
      await navigator.clipboard.writeText(buildBookmarklet(appUrl, token));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked - user can still drag the button */
    }
  };

  useEffect(() => {
    setAppUrl(window.location.origin);
    ensureSyncToken().then(setToken).catch(() => setToken(null));
  }, []);

  // React 19 blocks javascript: URLs passed via href, so set it directly on the
  // DOM node (that's what makes the anchor draggable to the bookmarks bar).
  useEffect(() => {
    if (linkRef.current && token && appUrl) {
      linkRef.current.setAttribute("href", buildBookmarklet(appUrl, token));
    }
  }, [token, appUrl]);

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-ink-soft">
        Works from any browser, even when the app is deployed - no password stored.
        Drag this button to your bookmarks bar:
      </p>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-canvas/60 p-3">
        {token ? (
          <a
            ref={linkRef}
            onClick={(e) => e.preventDefault()}
            draggable
            className="inline-flex cursor-grab items-center gap-2 rounded-lg border border-garnet-700/60 bg-garnet-600 px-4 py-2 text-sm font-semibold text-white shadow-lift active:cursor-grabbing"
            title="Drag me to your bookmarks bar"
          >
            <Bookmark size={15} /> Cortex Sync
          </a>
        ) : (
          <span className="text-xs text-ink-faint">Preparing your bookmarklet…</span>
        )}
        <span className="text-xs text-ink-faint">← drag to your bookmarks bar</span>
        {token ? (
          <button
            onClick={copyBookmarklet}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-paper px-2.5 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink hover:bg-canvas"
          >
            {copied ? <Check size={13} className="text-pass" /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy link"}
          </button>
        ) : null}
      </div>

      <p className="text-[11px] leading-relaxed text-ink-faint">
        On a phone (no bookmarks bar)? Tap <b>Copy link</b>, then create a new bookmark
        and paste it as the bookmark&apos;s <b>URL/address</b>. Works on iPhone Safari
        and Firefox for Android.
      </p>

      <ol className="ml-4 list-decimal space-y-1 text-xs leading-relaxed text-ink-soft">
        <li>Drag the button above onto your browser&apos;s bookmarks bar.</li>
        <li>
          Open <span className="font-mono">lms.uet.edu.pk</span> and log in (solve the
          captcha as normal).
        </li>
        <li>
          Click the <b>Cortex Sync</b> bookmark - it reads your results and sends them
          here. You&apos;ll get a confirmation pop-up.
        </li>
      </ol>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              setToken(await regenerateSyncToken());
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? <Check size={13} /> : <RefreshCw size={13} />} Reset token
        </Button>
        <span className="text-[11px] text-ink-faint">
          Resetting makes old copies of the bookmarklet stop working.
        </span>
      </div>
    </div>
  );
}
