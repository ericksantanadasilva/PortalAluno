"use client";

import React, { useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const tenantConfig = useTenant();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Estados para visibilidade das senhas
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Fluxo de Primeiro Acesso
  const [mustReset, setMustReset] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState({ identifier: "", password: "" });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Formulário de Login Principal
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginForm.identifier,
          password: loginForm.password
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Credenciais inválidas");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user_role", data.user.role);
      localStorage.setItem("tenant_slug", data.tenant.slug);

      if (data.user.mustChangePassword) {
        setSavedCredentials({ identifier: loginForm.identifier, password: loginForm.password });
        setMustReset(true);
        setIsLoading(false);
        return;
      }

      router.push("/dashboard/boletim");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 6) {
      setError("A nova senha deve conter pelo menos 6 caracteres.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:3001/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: savedCredentials.identifier,
          currentPassword: savedCredentials.password,
          newPassword: newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao redefinir senha");

      setMustReset(false);
      setLoginForm({ identifier: savedCredentials.identifier, password: newPassword });
      alert("Senha atualizada com sucesso! Insira sua nova senha para entrar.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Lado do Formulário */}
      <div className="flex flex-1 flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32 xl:max-w-xl z-10 relative bg-background/95 backdrop-blur-sm border-r border-border">
        <div className="mx-auto w-full max-w-sm flex flex-col space-y-8">

          <div className="flex flex-col space-y-2 text-center items-center">
            <div className="w-24 h-24 rounded-full overflow-hidden mb-4 ring-4 ring-primary/20">
              <img
                src={tenantConfig.logo_url}
                alt={`Logo ${tenantConfig.nome}`}
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {mustReset ? "Definir Nova Senha" : "Bem-vindo ao Portal"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mustReset
                ? "Substitua a sua senha temporária de primeiro acesso"
                : `Acesse sua conta do ${tenantConfig.nome}`}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-xs font-medium rounded-xl border border-destructive/20 animate-in fade-in-50">
              {error}
            </div>
          )}

          {/* 1. FORMULÁRIO DE LOGIN CONVENCIONAL */}
          {!mustReset ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">E-mail ou Matrícula</Label>
                <Input
                  id="identifier"
                  name="identifier"
                  placeholder="Seu e-mail ou número de matrícula"
                  required
                  type="text"
                  value={loginForm.identifier}
                  onChange={handleInputChange}
                  className="bg-background rounded-xl"
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
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    required
                    type={showLoginPassword ? "text" : "password"}
                    value={loginForm.password}
                    onChange={handleInputChange}
                    className="bg-background rounded-xl pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-10">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Entrar"}
              </Button>
            </form>
          ) : (
            /* 2. FORMULÁRIO DE PRIMEIRO ACESSO (RESET OBRIGATÓRIO) */
            <form onSubmit={handleResetSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha Definitiva</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    placeholder="Mínimo 6 caracteres"
                    required
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-background rounded-xl pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirme a Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  placeholder="Repita a nova senha exatamente"
                  required
                  type={showNewPassword ? "text" : "password"} // Segue o mesmo estado para facilitar o preenchimento duplo
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-background rounded-xl"
                />
              </div>

              <div className="pt-2 space-y-2">
                <Button type="submit" disabled={isLoading} className="w-full bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl h-10 shadow-sm">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Salvar Senha Definitiva"}
                </Button>

                <button
                  type="button"
                  onClick={() => setMustReset(false)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-2 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Cancelar e voltar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Lado da Imagem (White-Label Background) */}
      <div className="hidden lg:flex flex-1 relative bg-muted overflow-hidden">
        <img
          src={tenantConfig.background_login}
          alt="Login Background"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          // @ts-ignore - fetchPriority is supported in most modern browsers but types might lag
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      </div>
    </div>
  );
}