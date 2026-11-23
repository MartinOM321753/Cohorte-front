'use strict';
(() => {
  const copy={
    proposal:['Propuesta de portada','Hero proposal'],back:['Volver a la landing','Return to the landing page'],project:['Proyecto','Study'],follow:['Seguimiento','Follow-up'],evaluations:['Evaluaciones','Assessments'],team:['Equipo','Team'],login:['Acceder','Sign in'],theme:['Seguimiento · Evidencia · Salud','Follow-up · Evidence · Health'],cohort:['Cohorte de','The'],workers:['Trabajadores','Health Workers'],health:['de la Salud','Cohort Study'],country:['México','Mexico'],description:['Una historia de salud que se construye a lo largo del tiempo. Investigación que reúne evaluaciones, muestras biológicas y estilos de vida para comprender cómo cambia la salud de sus participantes.','A health story built over time. Research that brings together assessments, biological samples, and lifestyles to understand how participants’ health changes.'],explore:['Conoce el proyecto','Explore the study'],research:['Conoce la investigación','Explore the research'],tagline:['Observar hoy. Comprender el mañana.','Observe today. Understand tomorrow.']
  };
  let en=localStorage.getItem('cohorte-language')==='en';
  const button=document.querySelector('.language');
  const render=()=>{document.documentElement.lang=en?'en':'es';document.querySelectorAll('[data-copy]').forEach(el=>el.textContent=copy[el.dataset.copy][en?1:0]);button.textContent=en?'ES':'EN';button.setAttribute('aria-label',en?'Switch to Spanish':'Cambiar a inglés');};
  button.addEventListener('click',()=>{en=!en;localStorage.setItem('cohorte-language',en?'en':'es');render();});render();
})();
