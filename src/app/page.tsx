import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to Next.js + Shadcn UI + Tailwind CSS
        </h1>
        <div className="flex flex-col items-center gap-4">
          <p className="text-center text-lg">
            Get started by editing <code className="font-mono font-bold">src/app/page.tsx</code>
          </p>
          <div className="flex gap-4">
            <Button variant="default">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
          </div>
        </div>
      </div>
    </main>
  )
}
