UPDATE barbershops SET plan = 'pro' WHERE plan = 'start';
UPDATE barbershops SET "planStatus" = 'lifetime', "trialEndsAt" = NULL WHERE id = (SELECT b.id FROM barbershops b JOIN users u ON b."ownerId" = u.id WHERE u.email = 'adriancesar1911@gmail.com');
