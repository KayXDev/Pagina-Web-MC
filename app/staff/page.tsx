'use client';

import { motion } from 'framer-motion';
import { FaUsers, FaCrown, FaShieldAlt, FaUserShield } from 'react-icons/fa';
import PageHeader from '@/components/PageHeader';
import AnimatedSection from '@/components/AnimatedSection';
import { Card, Badge } from '@/components/ui';

export default function StaffPage() {
  const staff = [
    {
      name: 'Founder',
      role: 'Fundador',
      description: 'Creador y dueño del servidor',
      icon: <FaCrown className="text-6xl text-minecraft-gold" />,
      color: 'minecraft-gold',
    },
    {
      name: 'Admin1',
      role: 'Administrador',
      description: 'Gestión general y soporte técnico',
      icon: <FaShieldAlt className="text-6xl text-minecraft-redstone" />,
      color: 'minecraft-redstone',
    },
    {
      name: 'Admin2',
      role: 'Administrador',
      description: 'Gestión de eventos y comunidad',
      icon: <FaShieldAlt className="text-6xl text-minecraft-redstone" />,
      color: 'minecraft-redstone',
    },
    {
      name: 'Mod1',
      role: 'Moderador',
      description: 'Moderación del servidor y Discord',
      icon: <FaUserShield className="text-6xl text-minecraft-diamond" />,
      color: 'minecraft-diamond',
    },
    {
      name: 'Mod2',
      role: 'Moderador',
      description: 'Moderación del servidor y Discord',
      icon: <FaUserShield className="text-6xl text-minecraft-diamond" />,
      color: 'minecraft-diamond',
    },
    {
      name: 'Helper1',
      role: 'Ayudante',
      description: 'Soporte a jugadores',
      icon: <FaUsers className="text-6xl text-minecraft-grass" />,
      color: 'minecraft-grass',
    },
  ];

  const responsabilidades = {
    Administrador: [
      'Gestión completa del servidor',
      'Configuración de plugins y sistemas',
      'Toma de decisiones importantes',
      'Supervisión del staff',
      'Resolución de problemas técnicos',
    ],
    Moderador: [
      'Moderación del chat y comportamiento',
      'Aplicar sanciones según normas',
      'Resolver conflictos entre jugadores',
      'Gestión de tickets',
      'Vigilancia general del servidor',
    ],
    Ayudante: [
      'Ayudar a jugadores nuevos',
      'Responder preguntas frecuentes',
      'Reportar problemas al staff superior',
      'Crear ambiente amigable',
      'Soporte básico',
    ],
  };

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <PageHeader
        title="Nuestro Staff"
        description="El equipo que hace posible esta comunidad"
        icon={<FaUsers className="text-6xl text-minecraft-grass" />}
      />

      {/* Staff Grid */}
      <AnimatedSection>
        <div className="mb-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:mb-20 lg:gap-7">
          {staff.map((member, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full rounded-[30px] text-center">
                <div className="mb-4 flex justify-center">{member.icon}</div>
                <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{member.name}</h3>
                <Badge variant="info" className="mb-3">
                  {member.role}
                </Badge>
                <p className="text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">{member.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* Responsabilidades */}
      <AnimatedSection>
        <h2 className="mb-8 text-center text-3xl font-bold text-gray-900 dark:text-white sm:mb-10">
          Responsabilidades del Staff
        </h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:gap-7">
          {Object.entries(responsabilidades).map(([role, responsibilities], index) => (
            <motion.div
              key={role}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
            >
              <Card className="h-full rounded-[30px]">
                <h3 className="mb-4 flex items-center text-xl font-bold text-gray-900 dark:text-white">
                  {role === 'Administrador' && <FaShieldAlt className="mr-2 text-minecraft-redstone" />}
                  {role === 'Moderador' && <FaUserShield className="mr-2 text-minecraft-diamond" />}
                  {role === 'Ayudante' && <FaUsers className="mr-2 text-minecraft-grass" />}
                  {role}
                </h3>
                <ul className="space-y-2">
                  {responsibilities.map((resp, i) => (
                    <li key={i} className="flex items-start space-x-2 text-gray-700 dark:text-gray-300">
                      <span className="text-minecraft-grass font-bold">•</span>
                      <span className="text-sm">{resp}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* Únete al Staff */}
      <AnimatedSection>
        <div className="mt-16 sm:mt-20">
          <Card className="rounded-[34px] border-minecraft-grass bg-gradient-to-r from-minecraft-grass/20 to-minecraft-diamond/20 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">¿Quieres unirte al Staff?</h2>
            <p className="mx-auto mb-6 max-w-2xl text-sm leading-6 text-gray-700 dark:text-gray-300 sm:text-base">
              Buscamos personas comprometidas, maduras y con ganas de ayudar a la comunidad. 
              Las aplicaciones se abren periódicamente en nuestro Discord.
            </p>
            <Badge variant="info" className="text-base px-4 py-2">
              Requisitos: +16 años, 50+ horas de juego, Discord activo
            </Badge>
          </Card>
        </div>
      </AnimatedSection>
    </div>
  );
}
