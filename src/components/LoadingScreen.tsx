"use client";
import { useProgress } from '@react-three/drei';
import { EXPERIENCE } from '@/config/experience';
export default function LoadingScreen({ready=false}:{ready?:boolean}){
 const {progress,errors}=useProgress();
 const done=ready&&errors.length===0;
 return <div className={`arrival-card ${done?'arrival-card--ready':''}`} aria-hidden={done} inert={done}>
 <span className="eyebrow">A HOUSE FOR ART</span><h1>{EXPERIENCE.name}</h1><span className="arrival-rule"/>
 <p role="status">{errors.length?'The house could not be loaded.':ready?'Opening the doors…':'Preparing the house…'}</p>
 <div className="arrival-progress" role="progressbar" aria-label="Loading all rooms" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${progress}%`}}/></div>
 {errors.length>0&&<button onClick={()=>window.location.reload()}>Try again</button>}
 </div>;
}

