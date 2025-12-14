body{
  margin:0;
  font-family:Arial, sans-serif;
  background:#0d1117;
  color:#fff;
}

button,input,select{
  padding:10px;
  margin:5px 0;
  width:100%;
}

.topbar{
  background:#161b22;
  padding:10px;
  position:sticky;
  top:0;
}

.topbar-inner{
  display:flex;
  justify-content:space-between;
  align-items:center;
}

.container{
  width:90%;
  margin:auto;
}

.section{
  padding:30px 0;
}

.grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
  gap:15px;
}

.card{
  background:#161b22;
  padding:10px;
  border-radius:10px;
}

.card img{
  width:100%;
  height:150px;
  object-fit:cover;
}

.vendor-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:20px;
}

.panel{
  background:#161b22;
  padding:15px;
  border-radius:10px;
}

.cart{
  position:fixed;
  right:0;
  top:0;
  width:300px;
  height:100%;
  background:#161b22;
  padding:15px;
}

.hidden{display:none}

@media(max-width:800px){
  .vendor-grid{grid-template-columns:1fr}
}
