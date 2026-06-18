import { boletimSimuladoMock, historicoAbonosMock, QuestaoSimulado } from "@repo/database-mocks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Award, Stethoscope, CalendarDays } from "lucide-react";

// Helper para calcular dificuldade
function getDificuldade(taxa: number) {
  if (taxa > 70) return { label: "Fácil", color: "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400" };
  if (taxa >= 30) return { label: "Média", color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400" };
  return { label: "Difícil", color: "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400" };
}

export default function DashboardPage() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Desempenho Geral</h2>
        <p className="text-muted-foreground">Acompanhe seu boletim do último simulado e histórico de presenças.</p>
      </div>

      <Tabs defaultValue="boletim" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-6 bg-background">
          <TabsTrigger value="boletim">Boletim Detalhado</TabsTrigger>
          <TabsTrigger value="abonos">Presenças & Abonos</TabsTrigger>
        </TabsList>

        {/* Aba do Boletim */}
        <TabsContent value="boletim" className="space-y-4">
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-muted/50 border-b border-border pb-4">
              <CardTitle className="text-xl text-primary">Simulado Nacional - Fim de Semana</CardTitle>
              <CardDescription>Análise questão a questão baseada no desempenho da sua turma.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[80px] text-center">Nº</TableHead>
                    <TableHead>Tema</TableHead>
                    <TableHead className="text-center">Sua Resposta</TableHead>
                    <TableHead className="text-center">Gabarito</TableHead>
                    <TableHead className="text-center">Dificuldade</TableHead>
                    <TableHead className="text-right pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boletimSimuladoMock.map((questao: QuestaoSimulado) => {
                    const dif = getDificuldade(questao.taxa_acerto_turma);
                    const acertou = questao.status === "Acertou";

                    return (
                      <TableRow key={questao.numero} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-center font-medium">{questao.numero}</TableCell>
                        <TableCell className="font-medium text-foreground">{questao.tema}</TableCell>
                        <TableCell className="text-center">{questao.resposta_aluno}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{questao.resposta_correta}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`${dif.color} border-none font-semibold px-2.5 py-0.5`}>
                            {dif.label} ({questao.taxa_acerto_turma}%)
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end space-x-2">
                            {acertou ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-rose-500" />
                            )}
                            <span className={`font-medium ${acertou ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {questao.status}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Abonos */}
        <TabsContent value="abonos">
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-muted/50 border-b border-border pb-4">
              <CardTitle className="text-xl text-primary">Histórico de Abonos</CardTitle>
              <CardDescription>Acompanhe as justificativas de suas ausências.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {historicoAbonosMock.map((abono) => {
                  const isPedagogico = abono.tipo === "Abono Pedagógico";

                  return (
                    <div
                      key={abono.id}
                      className={`flex flex-col sm:flex-row gap-4 p-5 rounded-lg border transition-all hover:shadow-md ${isPedagogico
                        ? "bg-primary/5 border-primary/20"
                        : "bg-background border-border"
                        }`}
                    >
                      <div className={`mt-1 p-3 rounded-full h-fit flex-shrink-0 ${isPedagogico ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                        {isPedagogico ? <Award className="w-6 h-6" /> : <Stethoscope className="w-6 h-6" />}
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-foreground text-lg flex items-center gap-2">
                            {abono.tipo}
                            {isPedagogico && <Badge variant="default" className="bg-primary text-primary-foreground text-xs ml-2">Mérito</Badge>}
                          </h4>
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {abono.descricao}
                        </p>
                        <div className="flex items-center gap-2 text-xs font-medium text-foreground/70 pt-2">
                          <CalendarDays className="w-4 h-4 opacity-70" />
                          <span>
                            {abono.data_inicio === abono.data_fim
                              ? `Apenas ${abono.data_inicio}`
                              : `De ${abono.data_inicio} até ${abono.data_fim}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
