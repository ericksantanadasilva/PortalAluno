import { tenantConfigMock } from "@repo/database-mocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Lado do Formulário */}
      <div className="flex flex-1 flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32 xl:max-w-xl z-10 relative bg-background/95 backdrop-blur-sm border-r border-border">
        <div className="mx-auto w-full max-w-sm flex flex-col space-y-8">
          <div className="flex flex-col space-y-2 text-center items-center">
            {/* Logo da Escola */}
            <div className="w-24 h-24 rounded-full overflow-hidden mb-4 ring-4 ring-primary/20">
              <img
                src={tenantConfigMock.logo_url}
                alt={`Logo ${tenantConfigMock.nome}`}
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Bem-vindo ao Portal
            </h1>
            <p className="text-sm text-muted-foreground">
              Acesse sua conta do {tenantConfigMock.nome}
            </p>
          </div>

          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="matricula">Matrícula</Label>
              <Input
                id="matricula"
                placeholder="Ex: 2026001042"
                required
                type="text"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link
                  href="#"
                  className="text-sm font-medium text-primary hover:underline underline-offset-4"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <Input id="password" required type="password" className="bg-background" />
            </div>
            <Link href="/dashboard/boletim" passHref className="w-full block">
              <Button type="button" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Entrar
              </Button>
            </Link>
          </form>
        </div>
      </div>

      {/* Lado da Imagem (White-Label Background) */}
      <div
        className="hidden lg:flex flex-1 relative bg-cover bg-center"
        style={{ backgroundImage: `var(--background-login)` }}
      >
        <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      </div>
    </div>
  );
}
