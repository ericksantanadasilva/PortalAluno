"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Building2, User, CheckCircle2, LayoutDashboard, Copy } from "lucide-react";

interface Tenant {
  id: string;
  name: string;      // Alinhado com o schema do banco
  slug: string;
  primaryColor: string; // CamelCase do Prisma
}

const API_URL = "/api/god"; // URL centralizada do seu Express

export default function GodModePage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [impersonating, setImpersonating] = useState<Tenant | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const [formData, setFormData] = useState({
    name: "",             // Mapeado com o back
    slug: "",
    primaryColor: "#10b981",
    adminName: "",
    adminEmail: "",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // Carrega os tenants reais vindos do Express
  const fetchTenants = async () => {
    setLoadingTenants(true);
    try {
      const res = await fetch(`${API_URL}/tenants`);
      if (res.ok) {
        const data = await res.json();
        setTenants(data);
      } else {
        showToast("Erro ao carregar instâncias do servidor.");
      }
    } catch (err) {
      console.error(err);
      showToast("Não foi possível conectar à API Express.");
    } finally {
      setLoadingTenants(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/tenants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar instância");
      }

      // Sucesso Real: Pega os dados exatos vindos do back
      setTempPassword(data.temporaryPassword);
      setShowSuccessModal(true);

      // Limpa formulário e atualiza a listagem lateral
      setFormData({
        name: "",
        slug: "",
        primaryColor: "#10b981",
        adminName: "",
        adminEmail: "",
      });
      fetchTenants();

    } catch (error) {
      console.error(error);
      showToast((error as Error).message || "Erro ao processar onboarding");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImpersonate = (tenant: Tenant) => {
    setImpersonating(tenant);
    localStorage.setItem("impersonated_tenant_id", tenant.id);
    localStorage.setItem("impersonated_tenant_slug", tenant.slug);
    showToast(`Simulando acesso para ${tenant.name}`);
  };

  const handleStopImpersonating = () => {
    setImpersonating(null);
    localStorage.removeItem("impersonated_tenant_id");
    localStorage.removeItem("impersonated_tenant_slug");
    showToast("Voltou ao modo SuperUser original.");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-20" suppressHydrationWarning>

      {impersonating && (
        <div className="bg-amber-100 border-b border-amber-200 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm text-amber-900 font-medium animate-in slide-in-from-top-2">
          <p>Você está visualizando o portal como SuperUser na empresa <span className="font-bold">{impersonating.name}</span>.</p>
          <button onClick={handleStopImpersonating} className="underline hover:text-amber-700 transition-colors">
            [Voltar para o Painel Geral]
          </button>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 z-50">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto p-6 lg:p-8 mt-4 lg:mt-8">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            SuperUser <span className="text-slate-300 font-normal mx-1">/</span> God Mode
          </h1>
          <p className="text-slate-500 mt-2">Painel de controle mestre para gestão de instâncias (Tenants) e acesso isolado.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Formulário de Onboarding */}
          <section>
            <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl bg-white overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              <CardHeader className="pb-4 pt-6">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-500" />
                  Novo Cliente (Tenant)
                </CardTitle>
                <CardDescription>Crie uma nova instituição e o seu primeiro administrador master de forma unificada.</CardDescription>
              </CardHeader>
              <CardContent>
                <form id="onboarding-form" onSubmit={handleSubmit} className="space-y-7">

                  <div className="space-y-4">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dados da Instituição</h3>

                    <div className="grid gap-2">
                      <Label htmlFor="name" className="text-slate-700">Nome da Instituição</Label>
                      <Input id="name" name="name" required value={formData.name} onChange={handleInputChange} placeholder="Ex: Curso Progressão" className="bg-slate-50/50 border-slate-200 rounded-xl focus-visible:ring-indigo-500" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="slug" className="text-slate-700">Slug da URL</Label>
                        <Input id="slug" name="slug" required value={formData.slug} onChange={handleInputChange} placeholder="ex: curso-progressao" className="bg-slate-50/50 border-slate-200 rounded-xl focus-visible:ring-indigo-500" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="primaryColor" className="text-slate-700">Cor Primária</Label>
                        <div className="flex items-center gap-2">
                          <Input id="primaryColor" name="primaryColor" type="color" required value={formData.primaryColor} onChange={handleInputChange} className="w-12 h-10 p-1 bg-white border-slate-200 rounded-xl cursor-pointer" />
                          <Input type="text" readOnly value={formData.primaryColor} className="flex-1 bg-slate-50/50 border-slate-200 rounded-xl font-mono text-sm text-slate-500 focus-visible:ring-0" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-px bg-slate-100" />

                  <div className="space-y-4">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Admin Master</h3>

                    <div className="grid gap-2">
                      <Label htmlFor="adminName" className="text-slate-700">Nome Completo</Label>
                      <Input id="adminName" name="adminName" required value={formData.adminName} onChange={handleInputChange} placeholder="Ex: João da Silva" className="bg-slate-50/50 border-slate-200 rounded-xl focus-visible:ring-indigo-500" />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="adminEmail" className="text-slate-700">E-mail do Admin</Label>
                      <Input id="adminEmail" name="adminEmail" type="email" required value={formData.adminEmail} onChange={handleInputChange} placeholder="admin@escola.com" className="bg-slate-50/50 border-slate-200 rounded-xl focus-visible:ring-indigo-500" />
                    </div>
                  </div>

                </form>
              </CardContent>
              <CardFooter className="bg-slate-50/50 pt-6">
                <Button type="submit" form="onboarding-form" disabled={isSubmitting} className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10 h-11 transition-all">
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando Instância...</>
                  ) : (
                    <><Plus className="w-4 h-4 mr-2" /> Ativar Instância e Disparar Convite</>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </section>

          {/* Painel de Personificação */}
          <section className="space-y-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-slate-900">
                <User className="w-5 h-5 text-indigo-500" />
                Painel de Personificação
              </h2>
              <p className="text-sm text-slate-500">
                Acesse o ambiente como se fosse o usuário master de uma das escolas cadastradas.
              </p>
            </div>

            {loadingTenants ? (
              <div className="flex items-center justify-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
              </div>
            ) : tenants.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.02)] text-slate-500 text-sm">
                Nenhuma instituição encontrada no banco.
              </div>
            ) : (
              <div className="grid gap-3">
                {tenants.map(tenant => (
                  <div key={tenant.id} className="group bg-white border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] rounded-2xl p-4 flex items-center justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-slate-200 transition-all duration-300 ease-out cursor-default">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-inner font-bold text-lg" style={{ backgroundColor: tenant.primaryColor }}>
                        {tenant.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">{tenant.name}</h4>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">/{tenant.slug}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleImpersonate(tenant)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200/50"
                    >
                      <LayoutDashboard className="w-4 h-4 mr-2 text-indigo-500" />
                      Simular Acesso
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md rounded-2xl border-0 shadow-2xl p-0 overflow-hidden" showCloseButton={false}>
          <div className="bg-white px-6 py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-5 ring-8 ring-emerald-50/50">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <DialogTitle className="text-2xl font-bold mb-2 text-slate-900">Instância Ativada!</DialogTitle>
              <DialogDescription className="text-base text-slate-500 px-4">
                A empresa foi criada com sucesso no banco de dados e o log gerado no backend.
              </DialogDescription>

              <div className="mt-8 w-full">
                <p className="text-[13px] text-slate-500 mb-2 font-medium uppercase tracking-wider">Senha Temporária Gerada</p>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <span className="font-mono text-lg tracking-wider font-bold text-slate-900 ml-2">{tempPassword}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg hover:bg-slate-200 text-slate-600 w-10 h-10"
                    onClick={() => {
                      navigator.clipboard.writeText(tempPassword);
                      showToast("Senha copiada para a área de transferência!");
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 border-t border-slate-100 px-6 py-4 sm:justify-center">
            <Button onClick={() => setShowSuccessModal(false)} className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800 h-11 text-base font-medium shadow-sm">
              Concluir Onboarding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}