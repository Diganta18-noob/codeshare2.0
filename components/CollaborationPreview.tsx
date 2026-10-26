import UIIcon from '@/components/UIIcon';

export default function CollaborationPreview() {
  const lines = [
    <><span className="syntax-comment">// A little better, together.</span></>,
    <><span className="syntax-purple">const</span> team = [<span className="syntax-green">'you'</span>, <span className="syntax-green">'your next collaborator'</span>];</>,
    <>&nbsp;</>,
    <><span className="syntax-purple">function</span> <span className="syntax-blue">buildSomethingGreat</span>() {'{'}</>,
    <>  <span className="syntax-purple">return</span> team.<span className="syntax-blue">map</span>((person) <span className="syntax-purple">=&gt;</span> {'({'}</>,
    <>    ideas: <span className="syntax-green">'limitless'</span>,<span className="preview-cursor cursor-violet"><span>Alex</span></span></>,
    <>    possibilities: <span className="syntax-amber">Infinity</span>,</>,
    <>    betterTogether: <span className="syntax-amber">true</span>,</>,
    <>  {'}));'}</>,
    <>{'}'}</>,
    <>&nbsp;</>,
    <><span className="syntax-blue">buildSomethingGreat</span>();<span className="preview-cursor cursor-green"><span>You</span></span></>,
  ];
  return (
    <figure className="collab-preview" aria-label="Illustrative preview of two people editing JavaScript together">
      <div aria-hidden="true">
        <div className="preview-titlebar"><div className="preview-dots"><i /><i /><i /></div><span>your-next-big-idea</span><span className="preview-label">PREVIEW</span></div>
        <div className="preview-body">
          <div className="preview-activity"><UIIcon name="code" /><UIIcon name="people" /><UIIcon name="save" /><span className="preview-activity-bottom">⚙</span></div>
          <div className="preview-main">
            <div className="preview-tabs"><span className="preview-tab"><b>JS</b> together.js <span>×</span></span><div className="preview-avatars"><span>A</span><span>Y</span></div></div>
            <div className="preview-breadcrumb">workspace <span>›</span> together.js</div>
            <div className="preview-code">{lines.map((line, index) => <div className={`preview-code-line ${index === 5 ? 'preview-selected-line' : ''}`} key={index}><span className="preview-line-number">{index + 1}</span><code>{line}</code></div>)}</div>
            <div className="preview-terminal"><div><span>⌘</span> CONSOLE <span className="preview-terminal-dot" /></div><p><span>›</span> Ready when you are.<span className="terminal-caret" /></p></div>
          </div>
        </div>
        <div className="preview-status"><span><i /> Collaboration preview</span><span>JavaScript <span className="preview-status-encoding">UTF-8</span><UIIcon name="check" /></span></div>
      </div>
      <figcaption className="preview-callout"><span className="preview-callout-icon"><UIIcon name="people" /></span><span><strong>Same page. Same possibilities.</strong><small>Bring your ideas. Invite your people.</small></span><span className="preview-callout-spark">✦</span></figcaption>
    </figure>
  );
}
