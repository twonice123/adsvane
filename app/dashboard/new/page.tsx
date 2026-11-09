import BusinessForm from "../BusinessForm";

export const metadata = { title: "Add your business", robots: { index: false } };

export default function NewBusiness() {
  return (
    <div className="wrap narrow" style={{ margin: "0 auto 40px" }}>
      <h1>Add your business</h1>
      <p className="sub">Listing on AdsVane is free. You only pay if you choose to promote your profile.</p>
      <BusinessForm />
    </div>
  );
}
