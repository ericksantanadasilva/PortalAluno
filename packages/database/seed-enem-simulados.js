const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({ take: 1 });
  if (!tenants.length) {
    console.log('Nenhum tenant encontrado.');
    return;
  }
  const tenantId = tenants[0].id;

  // Busca disciplinas
  const subjects = await prisma.subject.findMany({ where: { tenantId } });
  const getSubj = (name) => subjects.find(s => s.name === name)?.id;
  
  const subjLang = getSubj('portugues');
  const subjEng = getSubj('ingles');
  const subjEsp = getSubj('espanhol');
  const subjHum = getSubj('historia');
  const subjNat = getSubj('biologia');
  const subjMat = getSubj('matematica');

  if (!subjLang || !subjMat || !subjHum || !subjNat) {
    console.error('Faltam disciplinas base (portugues, historia, biologia, matematica).');
    return;
  }

  // Criar 10 alunos
  console.log('Criando 10 alunos...');
  const students = [];
  for (let i = 1; i <= 10; i++) {
    const student = await prisma.user.upsert({
      where: { tenantId_email: { tenantId, email: `aluno${i}@teste.com` } },
      update: {},
      create: {
        tenantId,
        name: `Aluno Teste ${i}`,
        email: `aluno${i}@teste.com`,
        passwordHash: 'hash',
        role: 'aluno',
        registrationNumber: `MATR-ENEM-${i}`
      }
    });
    students.push(student);
  }

  // Gera as 180 questões do ENEM
  const examQuestionsData = [];
  const alternatives = ['A', 'B', 'C', 'D', 'E'];
  const randAlt = () => alternatives[Math.floor(Math.random() * alternatives.length)];

  for (let q = 1; q <= 180; q++) {
    let subjectId = subjMat;
    let language = 'none';

    if (q >= 1 && q <= 45) {
      if (q <= 5) {
        // Linguas estrangeiras (Inglês e Espanhol)
        examQuestionsData.push({
          questionNumber: q,
          correctAlternative: randAlt(),
          difficultyTier: 'medio',
          subjectId: subjEng,
          language: 'ingles'
        });
        examQuestionsData.push({
          questionNumber: q,
          correctAlternative: randAlt(),
          difficultyTier: 'medio',
          subjectId: subjEsp,
          language: 'espanhol'
        });
        continue;
      } else {
        subjectId = subjLang;
      }
    } else if (q >= 46 && q <= 90) {
      subjectId = subjHum;
    } else if (q >= 91 && q <= 135) {
      subjectId = subjNat;
    } else {
      subjectId = subjMat;
    }

    examQuestionsData.push({
      questionNumber: q,
      correctAlternative: randAlt(),
      difficultyTier: 'medio',
      subjectId: subjectId,
      language: language
    });
  }

  const examConfigs = [
    { title: 'Simulado ENEM Completo - Tier Difícil (Médias Baixas)', baseProb: 0.3 },
    { title: 'Simulado ENEM Completo - Tier Principal (Médias Normais)', baseProb: 0.65 },
    { title: 'Simulado ENEM Completo - Tier Fácil (Médias Altas)', baseProb: 0.85 }
  ];

  for (const config of examConfigs) {
    console.log(`\nCriando: ${config.title}...`);
    const exam = await prisma.exam.create({
      data: {
        tenantId,
        title: config.title,
        date: new Date(),
        totalQuestions: 180,
        type: 'enem',
        isPublished: true,
        examQuestions: {
          createMany: {
            data: examQuestionsData
          }
        }
      },
      include: {
        examQuestions: true
      }
    });

    console.log(`Criando respostas dos alunos para ${config.title}...`);
    const responsesData = [];

    for (const student of students) {
      // Cada aluno tem uma proficiência variando levemente da base do simulado
      const studentProb = Math.max(0.1, Math.min(0.95, config.baseProb + (Math.random() * 0.2 - 0.1)));

      for (let q = 1; q <= 180; q++) {
        let language = 'none';
        if (q <= 5) {
          language = Math.random() > 0.5 ? 'ingles' : 'espanhol';
        }

        const question = exam.examQuestions.find(eq => eq.questionNumber === q && eq.language === language);
        if (!question) continue;

        // Decide se acertou baseado na probabilidade
        const isCorrect = Math.random() < studentProb;
        
        let chosenAlt = '';
        if (isCorrect) {
          chosenAlt = question.correctAlternative;
        } else {
          // Erra: pega uma diferente da correta
          const wrongs = alternatives.filter(a => a !== question.correctAlternative);
          chosenAlt = wrongs[Math.floor(Math.random() * wrongs.length)];
        }

        responsesData.push({
          tenantId,
          examId: exam.id,
          studentId: student.id,
          questionNumber: q,
          chosenAlternative: chosenAlt,
          language: language,
          // Não marcamos isCorrect pq o seu controller faz isso na hora de fechar
        });
      }
    }

    // Inserção em lote para não demorar
    console.log(`Inserindo ${responsesData.length} respostas...`);
    // O createMany do Prisma pode ter limite de inserts simultâneos, então vamos particionar
    const chunkSize = 1000;
    for (let i = 0; i < responsesData.length; i += chunkSize) {
      const chunk = responsesData.slice(i, i + chunkSize);
      await prisma.studentResponse.createMany({ data: chunk });
    }
    
    console.log(`Pronto! Simulado ID: ${exam.id}`);
  }

  console.log('\nSeed finalizado com sucesso! Agora você pode usar os botões "Fechar Simulado" nestes simulados criados.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
