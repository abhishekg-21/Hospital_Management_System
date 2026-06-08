/*
  Warnings:

  - A unique constraint covering the columns `[doctorCode]` on the table `Doctor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `Doctor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `departmentId` to the `Doctor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `doctorCode` to the `Doctor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `Doctor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "address" TEXT,
ADD COLUMN     "departmentId" TEXT NOT NULL,
ADD COLUMN     "doctorCode" TEXT NOT NULL,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "qualification" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_doctorCode_key" ON "Doctor"("doctorCode");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_email_key" ON "Doctor"("email");

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
