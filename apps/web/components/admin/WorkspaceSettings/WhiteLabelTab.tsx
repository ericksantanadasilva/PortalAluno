'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { TenantStyleConfig } from '../types/workspace-settings.types';
import { UploadCloud, Image as ImageIcon, PaintBucket, Loader2 } from 'lucide-react';
import Image from 'next/image';

const API_URL = "http://localhost:3001/api";

export function WhiteLabelTab() {
  const [config, setConfig] = useState<TenantStyleConfig>({
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingLogin, setUploadingLogin] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const loginInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/tenant/config`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const newConfig = {
          primaryColor: data.primaryColor || '#3b82f6',
          secondaryColor: data.secondaryColor || '#1e40af',
          logoUrl: data.logoUrl,
          loginUrl: data.loginUrl
        };
        setConfig(newConfig);
        applyCssVariables(newConfig.primaryColor, newConfig.secondaryColor);
      }
    } catch (error) {
      console.error('Error fetching config', error);
    } finally {
      setLoading(false);
    }
  };

  const hexToHSL = (hex: string | any) => {
    if (!hex || typeof hex !== 'string') return '0 0% 0%';
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex[1] + hex[2], 16);
      g = parseInt(hex[3] + hex[4], 16);
      b = parseInt(hex[5] + hex[6], 16);
    }
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return `${Math.round(h * 360)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
  };

  const applyCssVariables = (primary: string, secondary: string) => {
    document.documentElement.style.setProperty('--primary', hexToHSL(primary));
    document.documentElement.style.setProperty('--secondary', hexToHSL(secondary));
  };

  const handleChangeColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newConfig = { ...config, [name]: value };
    setConfig(newConfig);
    applyCssVariables(newConfig.primaryColor, newConfig.secondaryColor);
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/tenant/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        alert('Configurações salvas com sucesso!');
      } else {
        alert('Erro ao salvar as configurações.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'login') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'logo') setUploadingLogo(true);
    else setUploadingLogin(true);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setConfig(prev => ({
            ...prev,
            [type === 'logo' ? 'logoUrl' : 'loginUrl']: data.url
          }));
        }
      } else {
        alert('Erro ao fazer o upload para o Google Drive.');
      }
    } catch (error) {
      console.error('Upload falhou', error);
      alert('Erro ao fazer o upload para o Google Drive.');
    } finally {
      if (type === 'logo') setUploadingLogo(false);
      else setUploadingLogin(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Config Form */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.02)] border-none rounded-2xl bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PaintBucket className="w-5 h-5 text-muted-foreground" />
              Cores do Sistema
            </CardTitle>
            <CardDescription>
              Defina as cores principais para alinhar a plataforma com a identidade visual da sua marca.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Cor Primária</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    id="primaryColor"
                    name="primaryColor"
                    value={config.primaryColor}
                    onChange={handleChangeColor}
                    className="w-14 h-14 p-1 cursor-pointer rounded-md"
                  />
                  <Input
                    type="text"
                    value={config.primaryColor}
                    onChange={handleChangeColor}
                    name="primaryColor"
                    className="flex-1 font-mono uppercase"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Usada para botões principais e destaques.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Cor Secundária</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    id="secondaryColor"
                    name="secondaryColor"
                    value={config.secondaryColor}
                    onChange={handleChangeColor}
                    className="w-14 h-14 p-1 cursor-pointer rounded-md"
                  />
                  <Input
                    type="text"
                    value={config.secondaryColor}
                    onChange={handleChangeColor}
                    name="secondaryColor"
                    className="flex-1 font-mono uppercase"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Usada para detalhes secundários e hover.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.02)] border-none rounded-2xl bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
              Imagens e Logomarcas
            </CardTitle>
            <CardDescription>
              Faça o upload da logomarca do seu curso e da imagem de fundo da tela de login. Elas serão salvas no Google Drive de forma automática.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
            <input type="file" ref={loginInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'login')} />

            <div className="space-y-3">
              <Label>Logo do Curso</Label>
              <div 
                onClick={() => !uploadingLogo && logoInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer relative overflow-hidden h-40"
              >
                {uploadingLogo ? (
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                ) : config.logoUrl ? (
                  <Image src={config.logoUrl} alt="Logo preview" fill className="object-contain p-2" unoptimized />
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8" />
                    <span className="text-sm font-medium">Clique para escolher a logo</span>
                    <span className="text-xs">PNG, JPG ou SVG (Máx. 2MB)</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Plano de Fundo (Login)</Label>
              <div 
                onClick={() => !uploadingLogin && loginInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer relative overflow-hidden h-40"
              >
                {uploadingLogin ? (
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                ) : config.loginUrl ? (
                  <Image src={config.loginUrl} alt="Login background preview" fill className="object-cover opacity-50" unoptimized />
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8" />
                    <span className="text-sm font-medium">Clique para escolher a imagem de fundo</span>
                    <span className="text-xs">PNG, JPG (Máx. 5MB)</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={saveConfig} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar Configurações
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Real-time Preview */}
      <div>
        <Card className="sticky top-6 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] border-none rounded-3xl bg-white">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-base">Preview em Tempo Real</CardTitle>
            <CardDescription className="text-xs">
              Como a plataforma se parecerá para seus alunos.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4 relative min-h-[300px]" style={{ backgroundColor: config.primaryColor + '10' }}>
              {config.loginUrl && (
                  <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                      backgroundImage: `url('${config.loginUrl}')`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                  }} />
              )}
              {/* Fake Dashboard Header */}
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="font-bold text-lg tracking-tight flex items-center gap-2">
                  {config.logoUrl ? (
                    <div className="relative w-8 h-8"><Image src={config.logoUrl} alt="Logo" fill className="object-contain" unoptimized /></div>
                  ) : (
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: config.primaryColor }} />
                  )}
                  Sua Marca
                </div>
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
                  <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
                </div>
              </div>

              {/* Fake Content Area */}
              <div className="space-y-4 relative z-10">
                <div className="bg-white rounded-2xl p-5 shadow-[0_4px_15px_rgb(0,0,0,0.02)] border-none transition-transform hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-bold text-slate-800">Desempenho Geral</div>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: config.primaryColor + '20', color: config.primaryColor }}>
                      <span className="text-[10px] font-bold">92%</span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: '92%', backgroundColor: config.primaryColor }}
                    />
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button
                      size="sm"
                      style={{
                        backgroundColor: config.primaryColor,
                        color: '#fff',
                        boxShadow: `0 4px 14px 0 ${config.primaryColor}40`
                      }}
                      className="rounded-full px-5 hover:opacity-90 transition-all font-semibold"
                    >
                      Ver Relatório
                    </Button>
                  </div>
                </div>

                <div
                  className="rounded-2xl p-4 text-white text-sm shadow-md transition-all hover:-translate-y-1"
                  style={{ backgroundColor: config.secondaryColor }}
                >
                  <div className="font-bold mb-1 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    Comunicado Oficial
                  </div>
                  <div className="opacity-90 text-xs mt-2 leading-relaxed">
                    O novo módulo intensivo de exatas já está disponível na plataforma. Acesse e turbine seus estudos.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
