/*
  Warnings:

  - You are about to drop the `class_subjects` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[tenant_id,modality_id,name]` on the table `classes` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `modality` on the `attendance_records` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `modality_id` to the `classes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ModalityType" AS ENUM ('presencial', 'online');

-- DropForeignKey
ALTER TABLE "class_subjects" DROP CONSTRAINT "class_subjects_class_id_fkey";

-- DropForeignKey
ALTER TABLE "class_subjects" DROP CONSTRAINT "class_subjects_subject_id_fkey";

-- DropIndex
DROP INDEX "classes_tenant_id_name_key";

-- AlterTable
ALTER TABLE "attendance_records" DROP COLUMN "modality",
ADD COLUMN     "modality" "ModalityType" NOT NULL;

-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "modality_id" UUID NOT NULL;

-- DropTable
DROP TABLE "class_subjects";

-- DropEnum
DROP TYPE "Modality";

-- CreateTable
CREATE TABLE "modalities" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modality_subjects" (
    "modality_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,

    CONSTRAINT "modality_subjects_pkey" PRIMARY KEY ("modality_id","subject_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "modalities_tenant_id_name_key" ON "modalities"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "classes_tenant_id_modality_id_name_key" ON "classes"("tenant_id", "modality_id", "name");

-- AddForeignKey
ALTER TABLE "modalities" ADD CONSTRAINT "modalities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_modality_id_fkey" FOREIGN KEY ("modality_id") REFERENCES "modalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modality_subjects" ADD CONSTRAINT "modality_subjects_modality_id_fkey" FOREIGN KEY ("modality_id") REFERENCES "modalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modality_subjects" ADD CONSTRAINT "modality_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
