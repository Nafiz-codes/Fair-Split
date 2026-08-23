import { redirect } from "next/navigation";
import { createGroup } from "@/app/actions/group";

export default function Home() {
  async function createGroupFromForm(formData: FormData) {
    "use server";
    const group = await createGroup(String(formData.get("name") ?? ""));
    redirect(`/group/${group.id}`);
  }

  return <main className="min-h-screen bg-slate-100 px-4 py-16 text-slate-900 sm:px-6"><section className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-10"><p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Fair Split</p><h1 className="mt-3 text-3xl font-bold tracking-tight">Start a new group</h1><p className="mt-3 text-slate-600">Create a group to begin tracking shared expenses.</p><form action={createGroupFromForm} className="mt-8 space-y-5"><label className="block text-sm font-medium text-slate-700" htmlFor="name">Group name<input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" id="name" name="name" placeholder="Weekend trip" required /></label><button className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2" type="submit">Create group</button></form></section></main>;
}
