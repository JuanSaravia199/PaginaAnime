from django.contrib import admin
from django.utils.html import format_html
from .models import Anime


@admin.register(Anime)
class AnimeAdmin(admin.ModelAdmin):
    list_display = ('mostrar_imagen', 'titulo', 'apodo', 'visto', 'fecha_creacion')
    list_filter = ('visto', 'fecha_creacion', 'genero')
    search_fields = ('titulo', 'apodo', 'genero')
    list_editable = ('visto',)
    ordering = ('-fecha_creacion',)
    list_per_page = 15

    def mostrar_imagen(self, obj):
        if obj.imagen_url:
            return format_html(
                '<img src="{}" style="width: 52px; height: 72px; object-fit: cover; border-radius: 6px; border: 1px solid #00ffd5; background: #111;" alt="{}" />',
                obj.imagen_url,
                obj.apodo or obj.titulo or 'Portada',
            )
        return 'Sin imagen'

    mostrar_imagen.short_description = 'Portada'


admin.site.site_header = 'Panel de control - Catálogo de Animes'
admin.site.site_title = 'Catálogo de Animes'
admin.site.index_title = 'Gestión del catálogo y base de datos'