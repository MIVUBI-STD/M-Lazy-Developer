import type { BugTrackerDocument, TrackerDeveloperNote, TrackerIssue, TrackerLevel } from "./model.js";
import { trackerGuidedRetestReadiness, validateBugTrackerDocument } from "./validate.js";

const e=(v:string)=>v.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const plural=(n:number,a:string,b=a+"s")=>n+" "+(n===1?a:b);
const row=(a:string,b:string)=>'<div class="row"><b>'+a+'</b><div>'+b+'</div></div>';
const evidenceLabel=(key:string)=>key.replace(/([a-z0-9])([A-Z])/g,"$1 $2").replace(/[_-]+/g," ").replace(/^./,x=>x.toUpperCase());
function developerEvidenceHtml(evidence:TrackerDeveloperNote["evidence"]):string {
 const items=Object.entries(evidence).map(([key,value])=>{
   const raw=typeof value==="string"?value:JSON.stringify(value,null,2)??"";
   return '<div class="evidence-item"><dt>'+e(evidenceLabel(key))+'</dt><dd>'+e(raw)+'</dd></div>';
 }).join("");
 return items?'<section class="dev-evidence"><h5>Evidence</h5><dl>'+items+'</dl></section>':"";
}

function issueHtml(i:TrackerIssue,n:number):string {
 const needs=i.verification==="NEEDS_VERIFY";
 const status=needs?"NEEDS VALIDATION":"VERIFIED ISSUE";
 const readiness=trackerGuidedRetestReadiness(i);
 const testReady=readiness.ready;
 const steps=i.reproduction.map(x=>"<li>"+e(x)+"</li>").join("");
 const testReadiness=testReady?"":'<section class="readiness-warning" role="status"><strong>Guided retest unavailable</strong><p>'+e(readiness.reason??"The finding cannot yet be retested.")+' Do not mark post-fix Passed/Failed until both evidence verification and test instructions are ready.</p></section>';
 const explanation=[
   i.whyThisIsBug?.trim()?'<section class="explanation-block"><h5>WHY THIS IS A '+(i.type==="DESIGN_MISMATCH"?"MISMATCH":"BUG")+'</h5><p>'+e(i.whyThisIsBug)+'</p></section>':"",
   i.impact?.trim()?'<section class="impact-block"><h5>IMPACT</h5><p>'+e(i.impact)+'</p></section>':"",
 ].join("");
 const test=[
   steps?'<section class="test-block"><h5>TEST IN-GAME</h5><ol>'+steps+'</ol></section>':"",
   (i.expected.trim()||i.observed.trim())?'<section class="behavior-comparison" aria-label="Expected and recorded observation">'+(i.expected.trim()?'<div class="expected-block"><h5>EXPECTED</h5><p>'+e(i.expected)+'</p></div>':"")+(i.observed.trim()?'<div class="observed-block"><h5>OBSERVED / EVIDENCE</h5><p>'+e(i.observed)+'</p><small>Recorded evidence; not a live tester result.</small></div>':"")+'</section>':"",
 ].join("");
 const technical=[
   i.technicalAnalysis?.trim()?row("Technical Analysis",e(i.technicalAnalysis)):"",
   i.relevantCode?.length?row("Relevant Code",'<ul class="source-list">'+i.relevantCode.map(x=>'<li><code>'+e(x.file)+'</code><span class="source-reason">'+e(x.reason)+'</span></li>').join("")+'</ul>'):"",
   i.resolution?.trim()?row("Recommended Fix",e(i.resolution)):"",
   i.mustPreserve?.length?row("Must Preserve",'<ul>'+i.mustPreserve.map(x=>'<li>'+e(x)+'</li>').join("")+'</ul>'):"",
 ].join("");
 return '<article class="issue severity-'+i.severity.toLowerCase()+'" data-issue-id="'+e(i.id)+'" data-test-ready="'+String(testReady)+'"><details><summary class="ih"><div class="tags"><span>'+String(n).padStart(2,"0")+'</span><span class="sev">'+i.severity+'</span><span class="status '+(needs?"need":"verified")+'">'+status+'</span><span class="result-label"></span></div><h4>'+e(i.title)+'</h4><p class="problem">'+e(i.issue)+'</p>'+(testReady?"":'<p class="readiness-flag">'+(needs?"VALIDATE EVIDENCE FIRST":"RETEST PROCEDURE NOT READY")+'</p>')+'<div class="issue-id">'+e(i.id)+'</div><div class="detail-action"><span class="expand">Test / Details ↓</span><span class="collapse">Collapse ↑</span></div></summary><div class="detail">'+explanation+test+testReadiness+'<section class="test-result"><h5>TEST RESULT</h5><p class="result-guidance">After a fix: Passed means Expected behavior is restored; Failed means the issue persists. This tester result never marks a canonical bug Fixed.</p><div class="result-buttons"><button type="button" data-result="SUCCESS"'+(testReady?"":' disabled aria-disabled="true"')+'>✓ PASSED</button><button type="button" data-result="FAILED"'+(testReady?"":' disabled aria-disabled="true"')+'>✕ FAILED</button></div></section>'+'<section class="tester-workspace"><label>Tester Notes</label><textarea class="notes" placeholder="Optional notes"></textarea></section><section class="tester-workspace"><label>Evidence <span>· Optional</span></label><div class="drop"><strong>Drop, paste, or browse screenshots</strong><small>PNG · JPEG · WebP · max 8 MB each</small><input class="files" type="file" accept="image/png,image/jpeg,image/webp" multiple></div><div class="pics"></div></section>'+(technical?'<details class="technical"><summary>Technical Details ↓</summary><p class="technical-context">'+(needs?"Finding evidence still needs validation; treat Technical Analysis and Recommended Fix as provisional.":"Technical Analysis explains the recorded evidence; it does not establish that a fix has passed a Minecraft retest.")+'</p>'+technical+'</details>':"")+'</div></details></article>';
}
function developerNoteHtml(note:TrackerDeveloperNote,n:number):string {

 return '<article class="issue devnote" data-issue-id="'+e(note.id)+'"><details><summary class="ih"><div class="tags"><span>'+String(n).padStart(2,"0")+'</span><span class="sev">DEV NOTE · REFERENCE</span></div><h4>'+e(note.title)+'</h4><div class="issue-id">'+e(note.id)+'</div><div class="detail-action"><span class="expand">View Details ↓</span><span class="collapse">Collapse ↑</span></div></summary><div class="detail">'+row("Problem",e(note.problem))+developerEvidenceHtml(note.evidence)+row("Action Required",e(note.action))+'<section class="tester-workspace"><label>Developer Notes <span>· Optional</span></label><textarea class="dev-notes" placeholder="Optional notes"></textarea></section></div></details></article>';
}

function developerNoteGroup(items:readonly TrackerDeveloperNote[],start:number,id:string):string {
 return items.length?'<section class="group" id="'+id+'"><h3>DEVELOPER NOTES<span>'+items.length+'</span></h3>'+items.map((x,j)=>developerNoteHtml(x,start+j)).join("")+'</section>':"";
}
function group(title:string,items:readonly TrackerIssue[],start:number,id:string):string {
 return items.length?'<section class="group" id="'+id+'"><h3>'+title+'<span>'+items.length+'</span></h3>'+items.map((x,j)=>issueHtml(x,start+j)).join("")+'</section>':"";
}
function levelHtml(l:TrackerLevel,anchor:string):string {
 const bugs=l.issues.filter(i=>i.type==="BUG"),dm=l.issues.filter(i=>i.type==="DESIGN_MISMATCH"),notes=l.devNotes;
 const groups=[["Bugs",bugs.length,"bugs"],["Design Mismatches",dm.length,"design"],["Developer Notes",notes.length,"notes"]] as const;
 const links=groups.filter(([,count])=>count>0).map(([label,count,suffix])=>'<a href="#'+anchor+'-'+suffix+'">'+label+' <strong>'+count+'</strong></a>').join("");
 const nav=links?'<nav class="lane-nav" aria-label="Finding sections">'+links+'</nav>':"";
 return '<section class="level" id="'+anchor+'"><header class="source"><div class="level-title">'+'<span class="level-badge">'+(l.level===null?"MAP":"LEVEL "+e(String(l.level)))+'</span>'+'<strong>v'+e(l.version)+'</strong></div><span class="source-label">SOURCE</span><div class="source-links"><a href="'+e(l.source.driveFolder)+'" target="_blank" rel="noopener noreferrer">Drive Folder ↗</a><a href="'+e(l.source.worldFile)+'" target="_blank" rel="noopener noreferrer">World File ↗</a></div><span class="filename">'+e(l.source.worldFilename)+'</span><div class="source-counts">'+plural(bugs.length,"Bug")+' · '+plural(dm.length,"Design Mismatch","Design Mismatches")+' · '+plural(notes.length,"Developer Note")+'</div></header>'+nav+group("BUGS",bugs,1,anchor+"-bugs")+group("DESIGN MISMATCHES",dm,1,anchor+"-design")+developerNoteGroup(notes,1,anchor+"-notes")+'</section>';
}
function levelLinks(levels:readonly TrackerLevel[],prefix:string):string {
 if(levels.length<2)return "";
 return '<nav class="level-nav" aria-label="Levels"><strong>Levels</strong>'+levels.map((level,i)=>'<a href="#'+prefix+'-'+(i+1)+'">'+(level.level===null?"Map":"Level "+e(String(level.level)))+'</a>').join("")+'</nav>';
}
const CSS=`:root{--navy:#172b4d;--navy2:#1d3964;--blue:#3157a4;--line:#d9dee8;--muted:#667085;--soft:#f8fafc;--page:#eef1f5;--active:#f5f8ff;--green:#f3faf5;--red:#fff5f5;--amber:#fff2dc}*{box-sizing:border-box}body{margin:0;background:var(--page);color:#172033;font:14px/1.5 Arial,sans-serif}.report{max-width:1080px;margin:24px auto;background:#fff;min-height:100vh;border:1px solid var(--line);box-shadow:0 10px 30px rgba(23,43,77,.08)}.hero{padding:24px 28px;background:var(--navy);color:#fff}.hero h1{margin:0;font-size:25px}.summary{display:grid;grid-template-columns:repeat(4,1fr)}.map-summary{grid-template-columns:repeat(3,1fr)}.map-report-head{padding:20px 22px 8px}.map-report-head>span{font-size:8px;font-weight:800;letter-spacing:.08em;color:#98a2b3}.map-report-head h2{margin:3px 0 0;font-size:21px;color:var(--navy)}.map-report-head p{margin:2px 0 8px;color:var(--muted);font-size:11px}.summary div{padding:18px 20px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}.summary div:last-child{border-right:0}.summary small{display:block;color:var(--muted);font-size:9px;font-weight:800}.summary strong{font-size:20px}.severity-strip{display:flex;justify-content:space-between;gap:12px;padding:10px 20px;background:var(--soft);color:var(--muted);font-size:11px}.jump{padding:18px 20px 20px;border-bottom:10px solid var(--page)}.jump h2{margin:0 0 10px;font-size:14px;color:var(--navy)}.jump-grid{display:grid;grid-template-columns:1fr 1fr;grid-auto-flow:column;gap:7px}.jump-grid a{display:grid;grid-template-columns:28px 1fr auto;align-items:center}.jump-grid a.active{border-color:var(--blue);border-left:4px solid var(--blue);background:var(--active);color:var(--navy)}.jump-grid a small{color:var(--muted);font-size:9px}.jump-grid a{padding:10px 12px;border:1px solid var(--line);border-radius:7px;color:var(--blue);text-decoration:none;font-size:11px;font-weight:700}.game{border-bottom:10px solid var(--page)}.map>summary{list-style:none;cursor:pointer}.map-head{display:flex;gap:14px;align-items:center;padding:17px 20px;background:var(--navy);color:#fff}.map[open]>.map-head{background:var(--navy2)}.map-head h2{margin:0;font-size:19px}.map-head p{margin:2px 0 0;font-size:10px}.map-toggle{margin-left:auto;padding:6px 9px;border:1px solid #ffffff61;border-radius:6px;font-size:9px}.map-close{display:none}.map[open] .map-open{display:none}.map[open] .map-close{display:inline}.level{padding:14px 16px 18px}.level+.level{border-top:10px solid var(--page);padding-top:18px}.source{padding:13px 14px;background:var(--soft);border:1px solid var(--line);border-radius:9px}.level-title{display:flex;gap:7px;align-items:center}.level-badge{padding:3px 7px;background:var(--navy);color:#fff;border-radius:5px;font-size:9px}.source-label{display:block;margin:7px 0 6px;color:#98a2b3;font-size:8px;font-weight:800}.source-links{display:grid;grid-template-columns:1fr 1fr;gap:7px}.source-links a{padding:6px;border:1px solid #b8c4d8;border-radius:6px;background:#fff;color:var(--blue);text-align:center;text-decoration:none;font-size:10px;font-weight:800}.filename{display:block;margin:7px 0;color:var(--muted);font-size:10px}.source-counts{font-size:9px;color:var(--muted)}.group h3{display:flex;justify-content:space-between;align-items:center;margin:18px 1px 9px;border-bottom:1px solid var(--line);padding-bottom:6px;color:var(--navy);font-size:11px;letter-spacing:.04em}.issue,.devnote{margin-bottom:9px;border:1px solid #d7dde7;border-radius:8px;background:#fff;overflow:hidden}.issue summary,.devnote summary{list-style:none;cursor:pointer}.ih{padding:12px 13px}.tags{display:flex;gap:5px}.tags>*{font-size:8px;font-weight:800}.sev,.status,.result-label{padding:3px 7px;border-radius:999px}.status{margin-left:auto}.verified{background:#edf7ef;color:#28733b}.need{background:var(--amber);color:#8a5700}.result-label{display:none}.issue h4,.devnote h4{max-width:820px;margin:8px 0 4px;font-size:14px;line-height:1.35}.problem{max-width:850px;margin:4px 0 7px;color:#475467;font-size:12px;line-height:1.5}.devnote .sev,.devnote .status{background:#eef2ff;color:#3730a3}.reference{background:#eef2ff!important;color:#3730a3!important}.issue-id{font:8px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;color:#98a2b3}.detail-action{margin-top:9px;padding-top:7px;border-top:1px solid #edf0f5;color:var(--blue);font-size:9px;font-weight:800}.collapse{display:none}.issue details[open] .expand{display:none}.issue details[open] .collapse{display:inline}.issue:has(details[open]){border:2px solid #6f93cc;border-left:5px solid var(--blue);background:var(--active)}.issue:has(details[open]) .ih{background:#f2f6fd}.detail{border-top:1px solid #c9d7ec}.explanation-block,.impact-block,.test-block,.expected-block,.test-result{padding:14px 16px;border-bottom:1px solid #dce5f2;background:#fff}.explanation-block h5,.impact-block h5,.test-block h5,.expected-block h5,.test-result h5{margin:0 0 7px;color:var(--navy);font-size:9px;letter-spacing:.06em}.test-block ol{margin:0;padding-left:20px}.test-block li{max-width:850px;margin:5px 0;font-size:12px;line-height:1.52}.explanation-block{background:#f8fbff}.impact-block{background:#fffaf2}.explanation-block p,.impact-block p{max-width:850px;margin:0;font-size:12px;line-height:1.52}.expected-block{background:#f7fbf8}.expected-block p{max-width:850px;margin:0;font-size:12px;line-height:1.52}.tester-workspace{padding:12px 16px;border-bottom:1px solid #dce5f2;background:#fff}.tester-workspace label{display:block;margin-bottom:7px;color:var(--navy);font-size:9px;font-weight:800}.tester-workspace label span{color:#98a2b3}.technical{border-bottom:1px solid #dce5f2}.technical>summary{padding:10px 16px;background:#f7f9fc;color:var(--blue);font-size:9px;font-weight:800}.technical .row:first-of-type{border-top:1px solid #dce5f2}.result-buttons{display:flex;gap:7px}.result-buttons button{padding:7px 10px;border:1px solid #b8c4d8;border-radius:6px;background:#fff;font-size:10px;font-weight:800;cursor:pointer}.result-buttons button[data-result="SUCCESS"].selected{border-color:#70ad7e;background:#e7f5ea;color:#28733b}.result-buttons button[data-result="FAILED"].selected{border-color:#d58b8b;background:#fff0f0;color:#9f1d20}.row{border-top:1px solid #dce5f2}.row>b{display:block;padding:8px 16px;background:#edf3fc;color:var(--blue);font-size:9px}.row>div{padding:10px 16px;background:#fbfcff;font-size:11px}.row pre{margin:0;white-space:pre-wrap;font:10px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace}.notes{width:100%;min-height:68px;padding:9px 10px;border:1px solid #b8c4d8;border-radius:6px;background:#fff;color:#172033;resize:vertical;font:12px/1.5 Arial,sans-serif}.notes:focus{outline:2px solid #c9d9f2;outline-offset:1px;border-color:var(--blue)}.drop{position:relative;padding:14px;border:1px dashed #9eacc1;text-align:center}.drop small{display:block}.drop input{position:absolute;inset:0;opacity:0}.pics{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:7px}.pic{border:1px solid var(--line);border-radius:6px;overflow:hidden;background:#fff}.pic img{display:block;width:100%;height:90px;object-fit:cover;cursor:zoom-in}.pic span{display:block;padding:5px;font-size:8px;overflow:hidden;text-overflow:ellipsis}.pic input{width:100%;border:0;border-top:1px solid var(--line);padding:5px;font-size:9px}.pic button{margin:0 5px 5px;border:0;background:none;color:#9f1d20;font-size:8px}.actions{text-align:right;padding:8px}.issue.success,.issue.success:has(details[open]){border:2px solid #70ad7e;background:var(--green)}.issue.success .ih{background:var(--green)}.issue.success .result-label{display:inline;margin-left:auto;background:#dcefe1;color:#28733b}.issue.failed,.issue.failed:has(details[open]){border:2px solid #d58b8b;background:var(--red)}.issue.failed .ih{background:var(--red)}.issue.failed .result-label{display:inline;margin-left:auto;background:#fde2e2;color:#9f1d20}.toolbar{display:flex;align-items:center;justify-content:flex-end;gap:12px;padding:9px 18px;border-bottom:1px solid var(--line);background:var(--soft)}.saved-local{font-size:9px;color:#98a2b3}.save{position:relative}.save-menu{display:none;position:absolute;right:0;top:31px;z-index:20;width:190px;background:#fff;border:1px solid var(--line);border-radius:7px}.save.on .save-menu{display:block}.save-menu button,.save>button{width:100%;padding:7px 9px;border:0;background:#fff;text-align:left}.save>button{border:1px solid #b8c4d8;border-radius:6px;font-weight:800}.toast{position:fixed;right:14px;bottom:14px;display:none;padding:8px 10px;background:#172033;color:#fff;border-radius:6px;font-size:10px}.toast.show{display:block}.lightbox{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:#000d;z-index:30}.lightbox.show{display:flex}.lightbox img{max-width:94vw;max-height:90vh}.lightbox button{position:absolute;right:12px;top:12px}.empty{padding:16px;color:#98a2b3}.technical-context{padding:10px 16px;margin:0;font-size:12px;line-height:1.5;color:var(--muted);background:var(--soft)}.source-list{padding-left:18px;margin:0}.source-list li+li{margin-top:9px}.source-list code{display:block;overflow-wrap:anywhere;word-break:break-word;font-size:11px}.source-reason{display:block;color:#475467;margin-top:3px}.dev-evidence{border-top:1px solid #dce5f2;padding:12px 16px;background:#fff}.dev-evidence h5{margin:0 0 9px;color:var(--navy);font-size:11px}.dev-evidence dl{margin:0}.evidence-item{display:grid;grid-template-columns:minmax(130px,25%) 1fr;gap:12px;padding:7px 0;border-top:1px solid #edf0f5}.evidence-item dt{font-size:11px;font-weight:700;color:var(--muted)}.evidence-item dd{margin:0;font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere}.readiness-flag{margin:6px 0;color:#8b5300;font-size:11px;font-weight:700}.readiness-warning{padding:12px 16px;border-bottom:1px solid #e2cb96;background:#fff8e8;color:#68440b}.readiness-warning strong{display:block;font-size:12px}.readiness-warning p,.result-guidance{margin:5px 0;font-size:12px;line-height:1.5}.result-guidance{color:#475467;margin-bottom:10px}.result-buttons button:disabled{opacity:.42;cursor:not-allowed;background:#f3f4f6}.saved-local[data-persist="error"]{color:#a22929;font-weight:700}.save-primary{border:1px solid #244988;border-radius:6px;background:var(--blue);color:#fff;font-size:13px;font-weight:800;padding:10px 16px;min-height:42px;cursor:pointer}.save-primary:hover{background:var(--navy2)}.toolbar{flex-wrap:wrap}.saved-local{margin-right:auto;max-width:530px;line-height:1.4}.save-menu{top:42px}.save>button{min-width:88px;text-align:center}.save-menu button{min-height:40px;border-bottom:1px solid var(--line);cursor:pointer}.save-menu button:last-of-type{border-bottom:0}

[hidden]{display:none!important}
.retest-progress{padding:14px 20px;border-bottom:1px solid var(--line);background:#fff}
.retest-progress>strong{display:block;color:var(--navy);font-size:13px;margin-bottom:7px}
.retest-counts{display:flex;flex-wrap:wrap;gap:8px}
.retest-counts span{padding:7px 11px;border:1px solid var(--line);border-radius:6px;font-size:12px;color:#344054}
.retest-counts b{font-size:16px;margin-left:5px}
.retest-counts .count-passed b{color:#28733b}
.retest-counts .count-failed b{color:#a22929}
.retest-progress small{display:block;margin-top:7px;color:var(--muted);font-size:11px}
.finding-tools{padding:14px 20px;background:var(--soft);border-bottom:1px solid var(--line)}
.finding-filters{display:flex;flex-wrap:wrap;align-items:end;gap:10px}
.finding-filters label{display:flex;flex:1 1 145px;flex-direction:column;gap:5px;color:#344054;font-size:12px;font-weight:700}
.finding-filters .search-label{flex:2 1 260px}
.finding-filters input,.finding-filters select{height:40px;width:100%;padding:8px 10px;background:#fff;border:1px solid #b8c4d8;border-radius:6px;color:#172033;font:13px/1.3 Arial,sans-serif}
.finding-filters button{min-height:40px;padding:8px 12px;border:1px solid #b8c4d8;border-radius:6px;background:#fff;color:var(--blue);font-weight:700;cursor:pointer}
.finding-filters input:focus-visible,.finding-filters select:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
.match-count{color:var(--muted);font-size:12px;margin:8px 0 0}
.no-matches{margin:0;padding:18px 20px;border-bottom:1px solid var(--line);color:var(--muted)}
.behavior-comparison{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:12px 16px;border-bottom:1px solid #dce5f2;background:#fff}
.behavior-comparison>div{min-width:0;padding:12px;border:1px solid var(--line);border-radius:7px}
.behavior-comparison .expected-block{background:#f7fbf8}
.behavior-comparison .observed-block{background:#f8fafc}
.behavior-comparison h5{margin:0 0 8px;font-size:12px;color:var(--navy);letter-spacing:.03em}
.behavior-comparison p{margin:0;font-size:14px;line-height:1.55;overflow-wrap:anywhere}
.behavior-comparison small{display:block;color:var(--muted);font-size:11px;margin-top:8px}
@media(max-width:700px){.retest-progress,.finding-tools{padding:12px}.behavior-comparison{grid-template-columns:1fr;padding:10px 12px}.finding-filters .search-label{flex-basis:100%}}
/* Reader-first typography and small contextual navigation. */
.hero{padding:16px 24px}.hero h1{font-size:17px;font-weight:700}
.map-report-head h2{font-size:26px;line-height:1.25}
.map-report-head>span,.source-label{font-size:11px}
.map-report-head p,.map-head p{font-size:13px}
.summary small{font-size:12px;line-height:1.35}.summary strong{font-size:24px}
.severity-strip{flex-wrap:wrap;justify-content:flex-start;column-gap:24px;row-gap:4px;font-size:12px}
.jump h2,.group h3{font-size:16px;letter-spacing:0}
.jump-grid a{font-size:13px;min-height:42px}.jump-grid a small{font-size:11px}
.map-head p{line-height:1.5}.map-toggle{font-size:12px}
.level{padding:18px 20px}.level+.level{padding-top:22px}
.source-label,.source-counts{font-size:12px}.filename{font-size:12px;overflow-wrap:anywhere}
.source-links a{font-size:13px;min-height:38px;display:flex;align-items:center;justify-content:center}
.level-badge{font-size:11px}.level-title strong{font-size:14px}
.issue,.devnote{margin-bottom:10px}
.ih{padding:15px 17px}.tags{flex-wrap:wrap;row-gap:6px}.tags>*{font-size:11px}
.issue h4,.devnote h4{font-size:17px;line-height:1.4}
.problem{font-size:14px;line-height:1.55;max-width:820px}
.issue-id{font-size:11px;overflow-wrap:anywhere}.detail-action{font-size:12px}
.explanation-block h5,.impact-block h5,.test-block h5,.expected-block h5,.test-result h5,.tester-workspace label,.technical>summary{font-size:12px}
.explanation-block p,.impact-block p,.expected-block p,.test-block li,.readiness-warning p,.result-guidance{font-size:14px;line-height:1.55;max-width:820px}
.test-block li{margin:8px 0}.test-block ol{padding-left:24px}
.row>b{font-size:12px}.row>div{font-size:14px;line-height:1.55;overflow-wrap:anywhere}
.technical-context,.evidence-item dd,.source-list code,.source-reason{font-size:13px;line-height:1.55}
.notes{font-size:14px}.result-buttons button{font-size:13px;min-height:40px}
.saved-local,.save-menu button,.save>button{font-size:12px}.save>button{min-height:38px}
.dev-evidence h5,.evidence-item dt{font-size:12px}
.lane-nav,.level-nav{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:14px 0 6px}
.level-nav{padding:12px 20px;margin:0;border-bottom:1px solid var(--line)}
.level-nav>strong{font-size:12px;color:var(--muted);margin-right:4px}
.lane-nav a,.level-nav a{display:inline-flex;gap:8px;align-items:center;min-height:36px;padding:6px 11px;border:1px solid var(--line);border-radius:6px;background:#fff;color:var(--blue);font-size:13px;font-weight:700;text-decoration:none}
.lane-nav a strong{color:var(--muted);font-size:12px}
.lane-nav a:hover,.level-nav a:hover{border-color:var(--blue);background:var(--active)}
.group,.level{scroll-margin-top:16px}
a:focus-visible,button:focus-visible,summary:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
@media(max-width:700px){
 .report{width:100%;margin:0;border:0;box-shadow:none}
 .hero{padding:14px 16px}.map-report-head{padding:16px 16px 8px}
 .map-report-head h2{font-size:23px}
 .summary{grid-template-columns:repeat(2,minmax(0,1fr))}
 .map-summary{grid-template-columns:repeat(3,minmax(0,1fr))}
 .summary div{padding:12px;min-width:0}
 .summary small{font-size:11px}
 .severity-strip{padding:12px 16px}
 .level{padding:12px}.level-nav{padding:10px 12px}
 .source-links{grid-template-columns:1fr}
 .jump{padding:14px 12px}
 .jump-grid{grid-template-columns:1fr;grid-template-rows:none!important;grid-auto-flow:row}
 .map-head{padding:14px;flex-wrap:wrap}
 .map-toggle{margin-left:0}
 .ih{padding:13px}
 .issue h4,.devnote h4{font-size:16px}
 .lane-nav,.level-nav{gap:6px}
 .evidence-item{grid-template-columns:1fr;gap:2px}
 .pics{grid-template-columns:1fr}
 .toolbar{padding:8px 12px}
}
`;

const JS=String.raw`
"use strict";
const REPORT = JSON.parse(document.getElementById("report-data").textContent);
const SNAP = document.getElementById("workspace-snapshot");
const scopeOf = report => JSON.stringify(report.games.flatMap(game =>
  game.levels.map(level => [level.source.projectId, level.source.artifactId,
    level.source.artifactFingerprint, level.source.version])
).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
const SCOPE = scopeOf(REPORT);
const COPY_ID = SNAP.dataset.copyId || "original";
const KEY = "m-bedrock-bug-tracker-workspace-v1:" + SCOPE + ":" + location.pathname + ":" + COPY_ID;
const BASE = REPORT.games.length === 1
  ? REPORT.games[0].name + "-" + (REPORT.games[0].levels.length === 1
    ? "v" + REPORT.games[0].levels[0].version : "Multi-Level")
  : "Combined";
const ISSUE_IDS = new Set(REPORT.games.flatMap(game => game.levels.flatMap(level =>
  level.issues.map(issue => issue.id))));
const NOTE_IDS = new Set(REPORT.games.flatMap(game => game.levels.flatMap(level =>
  level.devNotes.map(note => note.id))));
const IDS = new Set([...ISSUE_IDS, ...NOTE_IDS]);
const blank = () => ({ result: null, notes: "", attachments: [] });
function serializeWorkspace(value) {
  // Never permit an embedded tester string to terminate a script element.
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
function normalizeTesterState(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Tester workspace must be an object.");
  }
  const normalized = Object.create(null);
  for (const [id, entry] of Object.entries(value)) {
    if (!IDS.has(id) || !entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Unknown issue ID or invalid tester entry.");
    }
    const result = entry.result === undefined && entry.fixed === true
      ? "SUCCESS" : (entry.result === undefined ? null : entry.result);
    if (![null, "SUCCESS", "FAILED"].includes(result) || (NOTE_IDS.has(id) && result !== null)) {
      throw new Error("Invalid tester result.");
    }
    const notes = entry.notes === undefined ? "" : entry.notes;
    if (typeof notes !== "string") throw new Error("Invalid tester notes.");
    const attachments = entry.attachments === undefined ? [] : entry.attachments;
    if (!Array.isArray(attachments)) throw new Error("Invalid screenshot collection.");
    const safeAttachments = attachments.map(item => {
      if (!item || typeof item !== "object" || Array.isArray(item)
        || typeof item.name !== "string" || typeof item.type !== "string"
        || typeof item.data !== "string" || item.data.length > 12000000
        || typeof (item.caption === undefined ? "" : item.caption) !== "string"
        || !["image/png", "image/jpeg", "image/webp"].includes(item.type)
        || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(item.data)
        || !item.data.startsWith("data:" + item.type + ";base64,")) {
        throw new Error("Invalid or oversized screenshot.");
      }
      return { name: item.name, type: item.type, caption: item.caption || "", data: item.data };
    });
    normalized[id] = { result, notes, attachments: safeAttachments };
  }
  return normalized;
}
let WS = Object.create(null);
let initialSaveMessage = "Not yet saved in this browser";
let storageWarning = false;
try {
  WS = normalizeTesterState(JSON.parse(SNAP.textContent || "{}"));
  if (Object.keys(WS).length > 0) initialSaveMessage = "Loaded from saved HTML";
} catch {
  initialSaveMessage = "Embedded tester data is invalid; use a trusted backup";
  storageWarning = true;
}
try {
  const cached = localStorage.getItem(KEY);
  if (cached !== null) {
    WS = normalizeTesterState(JSON.parse(cached));
    initialSaveMessage = "Restored browser draft";
    storageWarning = false;
  }
} catch {
  storageWarning = true;
  if (initialSaveMessage === "Not yet saved in this browser") {
    initialSaveMessage = "Browser storage unavailable; use Save as HTML";
  }
}
const savedLabel = document.querySelector(".saved-local");
if (savedLabel) {
  savedLabel.textContent = initialSaveMessage;
  if (storageWarning) savedLabel.dataset.persist = "error";
}
const markSaved = () => {
  if (savedLabel) {
    savedLabel.textContent = "Autosaved in browser — use Save as HTML to share";
    savedLabel.dataset.persist = "ok";
  }
};
const markSaveFailed = () => {
  if (savedLabel) {
    savedLabel.textContent = "Not saved in browser — use Save as HTML before closing";
    savedLabel.dataset.persist = "error";
  }
};
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(WS));
    markSaved();
    return true;
  } catch {
    markSaveFailed();
    return false;
  }
};
const state = id => {
  if (!Object.hasOwn(WS, id)) WS[id] = blank();
  return WS[id];
};
const refreshers = [];
const toast = message => {
  const target = document.getElementById("toast");
  target.textContent = message;
  target.classList.add("show");
  setTimeout(() => target.classList.remove("show"), 2600);
};
const lb = document.getElementById("lightbox");
lb.querySelector("button").onclick = () => lb.classList.remove("show");
lb.onclick = event => { if (event.target === lb) lb.classList.remove("show"); };
document.querySelectorAll(".issue:not(.devnote)").forEach(card => {
  const id = card.dataset.issueId;
  const s = state(id);
  const testReady = card.dataset.testReady === "true";
  const note = card.querySelector(".notes");
  const buttons = [...card.querySelectorAll("[data-result]")];
  const label = card.querySelector(".result-label");
  const input = card.querySelector(".files");
  const drop = card.querySelector(".drop");
  const pics = card.querySelector(".pics");
  const apply = () => {
    card.classList.toggle("success", testReady && s.result === "SUCCESS");
    card.classList.toggle("failed", testReady && s.result === "FAILED");
    buttons.forEach(button => button.classList.toggle("selected",
      testReady && button.dataset.result === s.result));
    label.textContent = !testReady
      ? (s.result ? "Earlier result retained; current retest is unavailable" : "")
      : s.result === "SUCCESS" ? "✓ PASSED" : s.result === "FAILED" ? "✕ FAILED" : "";
  };
  note.oninput = () => { s.notes = note.value; save(); };
  buttons.forEach(button => button.onclick = () => {
    if (!testReady) return;
    s.result = s.result === button.dataset.result ? null : button.dataset.result;
    save();
    apply();
    refreshPresentation();
  });
  const render = () => {
    pics.replaceChildren();
    s.attachments.forEach((item, index) => {
      const node = document.createElement("div");
      node.className = "pic";
      node.innerHTML = '<img alt="Evidence"><span></span><input placeholder="Optional caption"><button type="button">Remove</button>';
      node.querySelector("img").src = item.data;
      node.querySelector("span").textContent = item.name;
      const caption = node.querySelector("input");
      caption.value = item.caption || "";
      caption.oninput = () => { item.caption = caption.value; save(); };
      node.querySelector("img").onclick = () => {
        lb.querySelector("img").src = item.data;
        lb.classList.add("show");
      };
      node.querySelector("button").onclick = () => {
        s.attachments.splice(index, 1);
        save();
        render();
      };
      pics.appendChild(node);
    });
  };
  const add = files => [...files].forEach(file => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)
      || file.size > 8388608) {
      toast("Use PNG, JPEG or WebP up to 8 MB");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast("Could not read screenshot");
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      s.attachments.push({ name: file.name, type: file.type, caption: "", data: reader.result });
      const persisted = save();
      render();
      toast(persisted ? "Screenshot autosaved in browser"
        : "Screenshot held in memory; use Save as HTML or JSON");
    };
    reader.readAsDataURL(file);
  });
  input.onchange = () => { if (input.files) add(input.files); input.value = ""; };
  drop.ondragover = event => event.preventDefault();
  drop.ondrop = event => { event.preventDefault(); add(event.dataTransfer.files); };
  drop.onpaste = event => {
    const files = [...event.clipboardData.files];
    if (files.length) { event.preventDefault(); add(files); }
  };
  refreshers.push(() => { note.value = s.notes; apply(); render(); });
});
document.querySelectorAll(".devnote").forEach(card => {
  const s = state(card.dataset.issueId);
  const note = card.querySelector(".dev-notes");
  note.oninput = () => { s.notes = note.value; save(); };
  refreshers.push(() => { note.value = s.notes; });
});
refreshers.forEach(refresh => refresh());
const testerCards = [...document.querySelectorAll(".issue:not(.devnote)")];
const allCards = [...document.querySelectorAll(".issue")];
const searchInput = document.getElementById("findingSearch");
const severityInput = document.getElementById("severityFilter");
const resultInput = document.getElementById("resultFilter");
const refreshPresentation = () => {
  const ready = testerCards.filter(card => card.dataset.testReady === "true");
  const passed = ready.filter(card => state(card.dataset.issueId).result === "SUCCESS").length;
  const failed = ready.filter(card => state(card.dataset.issueId).result === "FAILED").length;
  document.getElementById("retestPassed").textContent = String(passed);
  document.getElementById("retestFailed").textContent = String(failed);
  document.getElementById("retestUntested").textContent = String(ready.length - passed - failed);
  document.getElementById("retestUnavailable").textContent = String(testerCards.length - ready.length);
  const query = searchInput.value.trim().toLocaleLowerCase();
  const severity = severityInput.value;
  const result = resultInput.value;
  const active = Boolean(query || severity !== "all" || result !== "all");
  let visible = 0;
  for (const card of allCards) {
    const developerNote = card.classList.contains("devnote");
    const haystack = [
      card.querySelector("h4")?.textContent || "",
      card.querySelector(".issue-id")?.textContent || "",
      card.querySelector(".problem")?.textContent || "",
    ].join(" ").toLocaleLowerCase();
    const readyForRetest = card.dataset.testReady === "true";
    const outcome = developerNote || !readyForRetest ? "unavailable"
      : state(card.dataset.issueId).result === "SUCCESS" ? "passed"
      : state(card.dataset.issueId).result === "FAILED" ? "failed"
      : "untested";
    const match = haystack.includes(query)
      && (severity === "all" || (!developerNote && card.classList.contains("severity-" + severity)))
      && (result === "all" || (!developerNote && result === outcome));
    card.hidden = !match;
    if (match) visible++;
  }
  document.querySelectorAll(".group").forEach(group => {
    group.hidden = ![...group.querySelectorAll(".issue")].some(card => !card.hidden);
  });
  document.querySelectorAll(".level").forEach(level => {
    level.hidden = ![...level.querySelectorAll(".group")].some(group => !group.hidden);
  });
  document.querySelectorAll(".game").forEach(game => {
    game.hidden = ![...game.querySelectorAll(".level")].some(level => !level.hidden);
    if (active && !game.hidden) game.querySelector(".map").open = true;
  });
  document.querySelectorAll(".lane-nav a,.level-nav a,.jump-grid a").forEach(link => {
    const target = document.getElementById(link.getAttribute("href").slice(1));
    link.hidden = !target || target.hidden;
  });
  document.getElementById("visibleFindings").textContent =
    "Showing " + visible + " of " + allCards.length + " entries";
  document.getElementById("noFilterMatches").hidden = visible !== 0;
};
searchInput.oninput = refreshPresentation;
severityInput.onchange = refreshPresentation;
resultInput.onchange = refreshPresentation;
document.getElementById("clearFilters").onclick = () => {
  searchInput.value = "";
  severityInput.value = "all";
  resultInput.value = "all";
  refreshPresentation();
  searchInput.focus();
};
refreshPresentation();
document.querySelectorAll(".jump-grid a").forEach(anchor => anchor.onclick = event => {
  event.preventDefault();
  document.querySelectorAll(".map").forEach(map => map.removeAttribute("open"));
  document.querySelectorAll(".jump-grid a").forEach(link => link.classList.remove("active"));
  anchor.classList.add("active");
  const target = document.querySelector(anchor.getAttribute("href"));
  if (target) {
    const map = target.querySelector(".map");
    if (map) map.setAttribute("open", "");
    target.scrollIntoView({ behavior: "smooth" });
  }
});
function download(name, contents, type) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(new Blob([contents], { type }));
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
const fileStem = BASE.replace(/[^a-z0-9._-]+/gi, "-");
document.getElementById("saveHtml").onclick = () => {
  const clone = document.documentElement.cloneNode(true);
  const snapshot = clone.querySelector("#workspace-snapshot");
  snapshot.dataset.copyId = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  snapshot.textContent = serializeWorkspace(WS);
  download(fileStem + "-Tester-Report.html", "<!doctype html>" + clone.outerHTML, "text/html");
  toast("HTML download started; check your browser downloads before sharing");
};
document.getElementById("saveJson").onclick = () => {
  download(fileStem + "-Tester-Workspace.json",
    JSON.stringify({ canonical: REPORT, testerState: WS }, null, 2), "application/json");
  toast("JSON download started");
};
const more = document.querySelector(".save");
const moreButton = document.getElementById("saveButton");
moreButton.onclick = () => {
  const open = more.classList.toggle("on");
  moreButton.setAttribute("aria-expanded", String(open));
};
document.getElementById("importJson").onclick = () => document.getElementById("importFile").click();
document.getElementById("importFile").onchange = event => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onerror = () => toast("Could not read selected JSON");
  reader.onload = () => {
    let imported;
    try {
      const payload = JSON.parse(reader.result);
      if (!payload || !payload.canonical
        || JSON.stringify(payload.canonical) !== JSON.stringify(REPORT)) {
        throw new Error("Different report");
      }
      imported = normalizeTesterState(payload.testerState);
    } catch {
      toast("Invalid or different-map Bug Tracker JSON");
      return;
    }
    if (!confirm("Replace current tester results, notes, and screenshots with this JSON?")) return;
    for (const id of IDS) {
      const target = state(id);
      const next = Object.hasOwn(imported, id) ? imported[id] : blank();
      target.result = next.result;
      target.notes = next.notes;
      target.attachments = next.attachments;
    }
    refreshers.forEach(refresh => refresh());
    refreshPresentation();
    const persisted = save();
    toast(persisted ? "Tester JSON loaded and autosaved"
      : "Tester JSON loaded in memory; use Save as HTML before closing");
    more.classList.remove("on");
    moreButton.setAttribute("aria-expanded", "false");
  };
  reader.readAsText(file);
};
document.getElementById("resetData").onclick = () => {
  if (!confirm("Reset all tester results, notes, and screenshots in this page?")) return;
  for (const id of IDS) {
    const target = state(id);
    target.result = null;
    target.notes = "";
    target.attachments = [];
  }
  refreshers.forEach(refresh => refresh());
  refreshPresentation();
  const persisted = save(); // Keep an explicit empty override so an embedded HTML snapshot cannot return.
  toast(persisted ? "Tester data reset and autosaved"
    : "Reset in memory only; use Save as HTML before closing");
  more.classList.remove("on");
  moreButton.setAttribute("aria-expanded", "false");
};
`;


export function renderBugTrackerHtml(document:BugTrackerDocument):string {
 validateBugTrackerDocument(document);
 const all=document.games.flatMap(g=>g.levels.flatMap(l=>l.issues));
 const notes=document.games.flatMap(g=>g.levels.flatMap(l=>l.devNotes));
 const bugs=all.filter(i=>i.type==="BUG").length,dm=all.length-bugs;
 const count=(severity:string)=>all.filter(i=>i.severity===severity).length;
 const needs=all.filter(i=>i.verification==="NEEDS_VERIFY").length;
 const testReadyCount=all.filter(i=>trackerGuidedRetestReadiness(i).ready).length;
 // Missing guided instructions cannot identify provenance: tester reports
 // may lack a recorded procedure too. Never infer "source-only" here.
 const noGuidedProcedureCount=all.length-testReadyCount-needs;
 const combined=document.games.length>1;
 const payload=JSON.stringify(document).replaceAll("<","\\u003c");
 const toolbar='<div class="toolbar"><span class="saved-local" role="status" aria-live="polite">Not yet saved in this browser</span><button id="saveHtml" type="button" class="save-primary">Save as HTML</button><div class="save"><button id="saveButton" type="button" aria-expanded="false" aria-haspopup="true">More ▾</button><div class="save-menu"><button id="saveJson" type="button">Save JSON</button><button id="importJson" type="button">Load JSON</button><button id="resetData" type="button">Reset Tester Data</button><input id="importFile" type="file" accept=".json,application/json" hidden></div></div></div>';
 const severity='<div class="severity-strip"><span><b>Severity:</b> '+count("BLOCKER")+' Blocker · '+count("MAJOR")+' Major · '+count("MINOR")+' Minor</span><span>Needs Validation: '+needs+' · Retest Ready: '+testReadyCount+' · No Guided Procedure: '+noGuidedProcedureCount+'</span></div>';
 const retest='<section class="retest-progress" aria-label="After-fix retest results"><strong>After-Fix Retest Results</strong><div class="retest-counts"><span class="count-passed">Passed <b id="retestPassed">0</b></span><span class="count-failed">Failed <b id="retestFailed">0</b></span><span>Untested <b id="retestUntested">0</b></span><span>Not Retestable <b id="retestUnavailable">0</b></span></div><small>Tester results only · Not a canonical Fixed status · Unavailable findings remain in the report.</small></section>';
 const tools='<section class="finding-tools" aria-label="Find findings"><div class="finding-filters"><label class="search-label" for="findingSearch">Search findings<input id="findingSearch" type="search" placeholder="Title or issue ID" autocomplete="off"></label><label for="severityFilter">Severity<select id="severityFilter"><option value="all">All severities</option><option value="blocker">Blocker</option><option value="major">Major</option><option value="minor">Minor</option></select></label><label for="resultFilter">Retest result<select id="resultFilter"><option value="all">All results</option><option value="passed">Passed</option><option value="failed">Failed</option><option value="untested">Untested</option><option value="unavailable">Not Retestable</option></select></label><button id="clearFilters" type="button">Clear filters</button></div><p class="match-count" id="visibleFindings" role="status" aria-live="polite"></p></section><p id="noFilterMatches" class="no-matches" hidden>No findings match the current search or filters.</p>';
 let body="";
 if(!combined){
   const game=document.games[0]!;
   const gameIssues=game.levels.flatMap(l=>l.issues);
   const gameNotes=game.levels.flatMap(l=>l.devNotes);
   const gameBugs=gameIssues.filter(i=>i.type==="BUG").length;
   const gameDesign=gameIssues.length-gameBugs;
   const versions=[...new Set(game.levels.map(l=>l.version))];
   const versionLabel=versions.length===1?"v"+versions[0]:plural(game.levels.length,"Level");
   const mapSummary=[["BUGS",gameBugs],["DESIGN MISMATCHES",gameDesign],["DEVELOPER NOTES",gameNotes.length]].map(x=>'<div><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join("");
   body='<section class="map-report-head"><span>MAP REPORT</span><h2>'+e(game.name)+'</h2><p>'+e(versionLabel)+'</p></section><section class="summary map-summary">'+mapSummary+'</section>'+severity+retest+tools+levelLinks(game.levels,"map-level")+game.levels.map((l,i)=>levelHtml(l,"map-level-"+(i+1))).join("");
 }else{
   const summary=[["FINDINGS",all.length],["BUGS",bugs],["DESIGN",dm],["DEV NOTES",notes.length]].map(x=>'<div><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join("");
   const rows=Math.ceil(document.games.length/2);
   const jump=document.games.map((g,i)=>{const findings=g.levels.flatMap(l=>l.issues).length;return '<a href="#game-'+(i+1)+'" data-map-link="'+(i+1)+'"><span>'+String(i+1).padStart(2,"0")+'</span><b>'+e(g.name)+'</b><small>'+findings+'</small></a>';}).join("");
   const games=document.games.map((g,gi)=>{const x=g.levels.flatMap(l=>l.issues),n=g.levels.flatMap(l=>l.devNotes),gb=x.filter(i=>i.type==="BUG").length,gd=x.length-gb;return '<section class="game" id="game-'+(gi+1)+'"><details class="map"><summary class="map-head"><b>'+String(gi+1).padStart(2,"0")+'</b><div><h2>'+e(g.name)+'</h2><p>'+plural(x.length,"Finding")+' · '+plural(gb,"Bug")+' · '+plural(gd,"Design Mismatch","Design Mismatches")+' · '+plural(n.length,"Developer Note")+'</p></div><span class="map-toggle"><span class="map-open">Expand Map ↓</span><span class="map-close">Collapse Map ↑</span></span></summary>'+levelLinks(g.levels,"game-"+(gi+1)+"-level")+g.levels.map((l,i)=>levelHtml(l,"game-"+(gi+1)+"-level-"+(i+1))).join("")+'</details></section>';}).join("");
   body='<section class="summary">'+summary+'</section>'+severity+retest+tools+'<section class="jump"><h2>Maps</h2><div class="jump-grid" style="grid-template-rows:repeat('+rows+',auto)">'+jump+'</div></section>'+games;
 }
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bug Tracker Report</title><style>'+CSS+'</style></head><body><main class="report"><header class="hero"><h1>Bug Tracker Report</h1></header>'+toolbar+body+'</main><script id="workspace-snapshot" type="application/json">{}</script><script id="report-data" type="application/json">'+payload+'</script><div class="toast" id="toast"></div><div class="lightbox" id="lightbox"><button type="button">Close</button><img alt="Evidence preview"></div><script>'+JS+'</script></body></html>';
}
