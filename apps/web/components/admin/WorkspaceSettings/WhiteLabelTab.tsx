'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { TenantStyleConfig } from '../types/workspace-settings.types';
import { UploadCloud, Image as ImageIcon, PaintBucket } from 'lucide-react';

export function WhiteLabelTab() {
  const [config, setConfig] = useState<TenantStyleConfig>({
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
  });

  const hexToHSL = (hex: string) => {
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

  const handleChangeColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig({
      ...config,
      [name]: value,
    });
    
    // Atualiza a variável CSS no :root convertendo para HSL do Tailwind
    const hslValue = hexToHSL(value);
    if (name === 'primaryColor') {
      document.documentElement.style.setProperty('--primary', hslValue);
    } else if (name === 'secondaryColor') {
      document.documentElement.style.setProperty('--secondary', hslValue);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Config Form */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <Card>
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
          <CardFooter>
            <Button className="w-full sm:w-auto">Salvar Cores</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
              Imagens e Logomarcas
            </CardTitle>
            <CardDescription>
              Faça o upload da logomarca do seu curso e da imagem de fundo da tela de login.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Logo do Curso</Label>
              <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer">
                <UploadCloud className="w-8 h-8" />
                <span className="text-sm font-medium">Clique ou arraste a imagem da logo</span>
                <span className="text-xs">PNG, JPG ou SVG (Máx. 2MB)</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label>Plano de Fundo (Login)</Label>
              <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer">
                <UploadCloud className="w-8 h-8" />
                <span className="text-sm font-medium">Clique ou arraste a imagem de fundo</span>
                <span className="text-xs">PNG, JPG (Máx. 5MB)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Preview */}
      <div>
        <Card className="sticky top-6 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-base">Preview em Tempo Real</CardTitle>
            <CardDescription className="text-xs">
              Como a plataforma se parecerá para seus alunos.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4" style={{ backgroundColor: config.primaryColor + '10' }}>
              {/* Fake Dashboard Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="font-bold text-lg tracking-tight flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: config.primaryColor }} />
                  Sua Marca
                </div>
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
                  <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
                </div>
              </div>

              {/* Fake Content Area */}
              <div className="space-y-4">
                <div className="bg-background rounded-lg p-4 shadow-sm border border-border/50">
                  <div className="text-sm font-medium mb-2">Resumo de Desempenho</div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300" 
                      style={{ width: '65%', backgroundColor: config.primaryColor }} 
                    />
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button 
                      size="sm" 
                      style={{ 
                        backgroundColor: config.primaryColor, 
                        color: '#fff' 
                      }}
                      className="hover:opacity-90 transition-opacity"
                    >
                      Acessar Relatório
                    </Button>
                  </div>
                </div>

                <div 
                  className="rounded-lg p-4 text-white text-sm"
                  style={{ backgroundColor: config.secondaryColor }}
                >
                  <div className="font-semibold mb-1">Aviso Importante</div>
                  <div className="opacity-90 text-xs">As aulas de reforço começarão amanhã às 14h. Não perca!</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
