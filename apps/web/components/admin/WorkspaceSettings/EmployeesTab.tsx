'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Trash2, Mail, ShieldAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const API_URL = "http://localhost:3001/api";

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string | null;
  mustChangePassword: boolean;
}

export function EmployeesTab() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Formulário
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDepartment, setFormDepartment] = useState('');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [tempEmployeeName, setTempEmployeeName] = useState('');

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const carregarFuncionarios = async () => {
    setLoading(true);
    try {
      const headers = getHeaders();
      const res = await fetch(`${API_URL}/employees`, { headers });

      if (res.ok) {
        setEmployees(await res.json());
      } else {
        console.error("Falha ao carregar funcionários do servidor");
      }
    } catch (err) {
      console.error("Erro ao buscar funcionários", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarFuncionarios();
  }, []);

  const handleConvidar = async () => {
    if (!formName || !formEmail || !formDepartment) {
      alert("Preencha todos os campos.");
      return;
    }

    try {
      const headers = getHeaders();
      const res = await fetch(`${API_URL}/employees`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          department: formDepartment
        })
      });

      if (res.ok) {
        const data = await res.json();

        // Adiciona na lista
        setEmployees(prev => [...prev, data.employee]);

        // Abre o dialog com a senha temporária
        setTempEmployeeName(data.employee.name);
        setGeneratedPassword(data.tempPassword);
        setIsDialogOpen(true);

        // Limpa formulário
        setFormName('');
        setFormEmail('');
        setFormDepartment('');
      } else {
        const errData = await res.json();
        alert(errData.error || "Erro ao convidar funcionário.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao convidar funcionário.");
    }
  };

  const handleRemover = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este funcionário? O acesso dele será revogado.")) return;

    try {
      const res = await fetch(`${API_URL}/employees/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (res.ok) {
        setEmployees(prev => prev.filter(e => e.id !== id));
      } else {
        const errData = await res.json();
        alert(errData.error || "Erro ao remover funcionário.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchName = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDept = departmentFilter ? emp.department?.toLowerCase().includes(departmentFilter.toLowerCase()) : true;
    return matchName && matchDept;
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="lista" className="w-full flex flex-col space-y-6">
        <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 border rounded-lg flex-col sm:flex-row">
          <TabsTrigger value="lista" className="py-2.5 px-4">Lista de Funcionários</TabsTrigger>
          <TabsTrigger value="convidar" className="py-2.5 px-4">Convidar Funcionário</TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border-none rounded-2xl bg-white">
            <CardHeader className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div>
                <CardTitle>Equipe</CardTitle>
                <CardDescription>Gerencie os acessos administrativos da sua instituição.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative w-full sm:w-[200px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por setor..."
                    className="pl-8 bg-background"
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                  />
                </div>
                <div className="relative w-full sm:w-[220px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar nome/email..."
                    className="pl-8 bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Tem acesso?</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell>{emp.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {emp.department || 'Administração'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {emp.mustChangePassword ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                              Pendente
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                              Sim
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemover(emp.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredEmployees.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          Nenhum funcionário encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="convidar" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.02)] border-none rounded-2xl bg-white max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Convidar para a Equipe</CardTitle>
              <CardDescription>
                O funcionário receberá uma senha provisória e deverá alterá-la no primeiro acesso.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nomeFunc">Nome Completo</Label>
                <Input
                  id="nomeFunc"
                  placeholder="Ex: Carlos Eduardo"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailFunc">E-mail Corporativo</Label>
                <Input
                  id="emailFunc"
                  type="email"
                  placeholder="carlos@escola.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setorFunc">Setor / Departamento</Label>
                <Input
                  id="setorFunc"
                  placeholder="Ex: Financeiro, Secretaria, TI..."
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                />
                <p className="text-xs text-muted-foreground pt-1">
                  Se diferente de "secretaria" ou "professor", o usuário terá acesso administrativo geral.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end pt-4">
              <Button className="gap-2" onClick={handleConvidar}>
                <UserPlus className="w-4 h-4" />
                Criar Acesso
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para mostrar a senha provisória, simulando o email */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Acesso Criado com Sucesso
            </DialogTitle>
            <DialogDescription>
              O funcionário <strong>{tempEmployeeName}</strong> foi adicionado ao sistema.
              <br /><br />
              Como o envio de e-mails ainda não está ativo, copie a senha provisória abaixo e envie para ele de forma segura.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 bg-muted p-4 rounded-md">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="link" className="sr-only">
                Senha
              </Label>
              <Input
                id="link"
                value={generatedPassword}
                readOnly
                className="font-mono text-center text-lg tracking-widest bg-background"
              />
            </div>
            <Button size="sm" className="px-3" onClick={() => {
              navigator.clipboard.writeText(generatedPassword);
              alert("Copiado!");
            }}>
              <span className="sr-only">Copy</span>
              Copiar
            </Button>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
