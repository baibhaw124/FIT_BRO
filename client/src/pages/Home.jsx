import { ArrowDown, ArrowUpRight, Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';
import Programs from '../sections/Programs.jsx';
import EquipmentScene from '../three/EquipmentScene.jsx';

export default function Home() {
  return <div className="home-page">
    <section className="hero hero-athlete" aria-labelledby="hero-title">
      <div className="hero-image" aria-hidden="true" />
      <div className="hero-shade" aria-hidden="true" />
      <div className="hero-content">
        <span className="eyebrow"><i className="live-dot" /> FIT_BRO TRAINING CLUB</span>
        <h1 id="hero-title">DON'T LIMIT YOUR CHALLENGES.<br /><em>CHALLENGE YOUR LIMITS.</em></h1>
        <p>Train with intent. Build strength with structure. Find your next session and put the work in.</p>
        <div className="hero-actions">
          <Link to="/sessions" className="button button-primary">BOOK A SESSION <ArrowUpRight size={17} /></Link>
          <a href="#programs" className="button button-ghost">EXPLORE TRAINING <ArrowDown size={16} /></a>
        </div>
      </div>
      <div className="hero-bottom"><span>STRENGTH / CONDITIONING / CONTROL</span><a href="#programs">SCROLL TO TRAINING <ArrowDown size={14} /></a></div>
    </section>

    <Programs />

    <section className="equipment-section" id="equipment">
      <div className="equipment-copy">
        <span className="eyebrow">EQUIPMENT / 001</span>
        <h2>RESPECT<br /><span>THE REP.</span></h2>
        <p>Good training is built on the basics: solid equipment, consistent effort, and the discipline to return.</p>
        <div className="equipment-spec"><span><Dumbbell size={15} /> BARBELL & DUMBBELLS</span><span>STEEL · GRIP · CONTROL</span></div>
        <Link to="/sessions" className="button button-primary">FIND YOUR SESSION <ArrowUpRight size={17} /></Link>
      </div>
      <div className="equipment-canvas" id="equipment-scene">
        <EquipmentScene />
        <span className="canvas-label">FIT_BRO / TRAINING TOOLS</span>
        <span className="canvas-number">01</span>
      </div>
    </section>

    <section className="standards-section section">
      <div className="section-head"><div><span className="eyebrow">THE FIT_BRO STANDARD</span><h2>SHOW UP.<br /><span className="muted">DO THE WORK.</span></h2></div><p>Clear coaching. Structured sessions.<br />A place to keep making progress.</p></div>
      <div className="standards-grid">
        <article><span className="standard-index">01</span><h3>COACHING THAT CLICKS</h3><p>Clear cues, sound technique, and progressions that meet you where you are.</p></article>
        <article><span className="standard-index">02</span><h3>WORK WITH PURPOSE</h3><p>Sessions shaped around strength, conditioning, and movement quality.</p></article>
        <article><span className="standard-index">03</span><h3>YOUR PLACE TO RETURN</h3><p>A training environment built around consistency, effort, and respect.</p></article>
      </div>
    </section>

    <section className="booking-cta">
      <div className="cta-text"><span className="eyebrow">YOUR NEXT MOVE</span><h2>READY WHEN<br /><span>YOU ARE.</span></h2><p>Choose a session, reserve your place, and show up ready to work.</p><Link to="/sessions" className="button button-primary">VIEW SESSIONS <ArrowUpRight size={17} /></Link></div>
      <div className="cta-image" aria-hidden="true" />
    </section>
  </div>;
}
