import Link from "next/link";
import { SLIDES } from "@/lib/slides";
import Slideshow from "./components/Slideshow";

export default function Landing() {
  return (
    <>
      <Slideshow slides={SLIDES} />
      <section className="wrap choose">
        <h1>What would you like to do?</h1>
        <div className="big2">
          <Link href="/find" className="bigcard">
            <span className="bigicon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            </span>
            <span className="bigtitle">Find services</span>
            <span className="bigtext">Hair braiding, barbers, restaurants, movers and more near you, with real reviews.</span>
            <span className="b bigbtn">Find services →</span>
          </Link>
          <Link href="/dashboard" className="bigcard alt">
            <span className="bigicon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 5 4h14l2 5.5" /><path d="M3 9.5h18v1a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z" /><path d="M5 13v7h14v-7" /><path d="M12 15v4M10 17h4" /></svg>
            </span>
            <span className="bigtitle">Put your business on AdsVane</span>
            <span className="bigtext">Free listing. Get reviews from your customers. Promote when you're ready.</span>
            <span className="b bigbtn">Add my business →</span>
          </Link>
        </div>
      </section>
    </>
  );
}
