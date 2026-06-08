/*
  Warnings:

  - You are about to drop the column `disease` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Patient` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[patientCode]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `firstName` to the `Patient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Patient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientCode` to the `Patient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Patient` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Patient" DROP COLUMN "disease",
DROP COLUMN "name",
ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "diseaseHistory" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "emergencyPhone" TEXT,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "patientCode" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "bloodGroup" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Patient_patientCode_key" ON "Patient"("patientCode");
