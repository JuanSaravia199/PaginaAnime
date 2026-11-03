from django.db import models

class Anime(models.Model):
    titulo = models.CharField(max_length=200, blank=True, null=True)
    apodo = models.CharField(max_length=150)
    imagen_url = models.URLField(max_length=500, blank=True, null=True)
    episodios = models.IntegerField(blank=True, null=True)
    ano = models.IntegerField(blank=True, null=True)
    genero = models.CharField(max_length=150, blank=True, null=True)
    descripcion = models.TextField(blank=True, null=True)
    visto = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Anime'
        verbose_name_plural = 'Catálogo de Animes'

    def __str__(self):
        return self.apodo