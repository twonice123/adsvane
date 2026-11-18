import StartForm from "@/app/signup/StartForm";

export const metadata = { title: "Create your business profile", robots: { index: false } };

export default function NewBusiness() {
  return (
    <div className="wrap narrow" style={{ margin: "26px auto 50px" }}>
      <div className="card su-card">
        <StartForm needAccount={false} />
      </div>
    </div>
  );
}
