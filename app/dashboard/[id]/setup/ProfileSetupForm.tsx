"use client";
import { useActionState } from "react";
import { SOCIAL, socialLink, type Business } from "@/lib/data";
import { saveProfileSetup, type FormState } from "../../actions";

export default function ProfileSetupForm({ biz, hasPics }: { biz: Business; hasPics: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfileSetup, {});
  return (
    <form action={action}>
      <input type="hidden" name="id" value={biz.id} />
      <div className="fld">
        <label htmlFor="ps-phone">Phone number</label>
        <input id="ps-phone" name="phone" type="tel" autoComplete="tel" defaultValue={biz.phone || ""} placeholder="So customers can call or text you" />
      </div>
      <div className="fld">
        <label htmlFor="ps-about">Tell customers about your business</label>
        <textarea id="ps-about" name="description" maxLength={2000} defaultValue={biz.description || ""} placeholder="What you do, what you're known for, who you serve." />
      </div>

      <h2 className="st-h2">Add your social media</h2>
      {SOCIAL.map((s) => (
        <div key={s.key} className="fld">
          <label htmlFor={`ps-${s.key}`}>{s.label} <span className="muted">(optional)</span></label>
          <input id={`ps-${s.key}`} name={`social_${s.key}`} type="text" autoComplete="off" autoCapitalize="none" defaultValue={socialLink(s.key, biz.social?.[s.key]) || ""} placeholder="@yourpage" />
        </div>
      ))}
      <div className="fld">
        <label htmlFor="ps-web">Website <span className="muted">(optional)</span></label>
        <input id="ps-web" name="website" type="text" inputMode="url" autoComplete="url" autoCapitalize="none" defaultValue={biz.website || ""} placeholder="yourbusiness.com" />
      </div>

      {!hasPics && <p className="note" role="status">Add your profile picture and cover photo above to continue.</p>}
      {state.error && <p className="err" role="alert">{state.error}</p>}
      <div className="st-btns">
        <button className="b" type="submit" disabled={pending || !hasPics}>{pending ? "Saving…" : "Save and continue"}</button>
      </div>
    </form>
  );
}
