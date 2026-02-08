import { CustomerForm } from "@/components/customers/customer-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Customer",
};

export default function NewCustomerPage() {
  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-6 text-lg font-bold">Add Customer</h1>
      <CustomerForm />
    </div>
  );
}
