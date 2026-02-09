import { CustomerForm } from "@/components/customers/customer-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Customer",
};

export default function NewCustomerPage() {
  return (
    <div className="p-4 sm:p-6">
      <CustomerForm />
    </div>
  );
}
